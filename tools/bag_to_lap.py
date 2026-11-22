#!/usr/bin/env python3
"""Extract one real lap from an ARCUS rosbag for the portfolio hero replay.

Reads a ROS 1 or ROS 2 bag (no ROS install needed), finds one closed lap, resamples it and writes
resources/data/arcus-lap.js, which telemetry.js picks up automatically.

    pip install rosbags numpy
    python tools/bag_to_lap.py path/to/bag                      # uses /pf/pose/odom
    python tools/bag_to_lap.py path/to/bag --start 42 --speed-topic /drive

Supported pose types: nav_msgs/Odometry, geometry_msgs/PoseStamped,
geometry_msgs/PoseWithCovarianceStamped.
Speed (optional): ackermann_msgs/AckermannDriveStamped (drive.speed) or nav_msgs/Odometry
(twist.linear.x). Without it, speed comes from the odometry twist or is derived from the poses.
Mode (optional): std_msgs/String, e.g. PURE_PURSUIT / DISPARITY_EXT, shown in the HUD.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from rosbags.highlevel import AnyReader
from rosbags.typesys import Stores, get_types_from_msg, get_typestore

ACKERMANN_DEFS = {
    'ackermann_msgs/msg/AckermannDrive': """
float32 steering_angle
float32 steering_angle_velocity
float32 speed
float32 acceleration
float32 jerk
""",
    'ackermann_msgs/msg/AckermannDriveStamped': """
std_msgs/Header header
ackermann_msgs/AckermannDrive drive
""",
}


def build_typestore():
    store = get_typestore(Stores.ROS2_HUMBLE)
    types = {}
    for name, text in ACKERMANN_DEFS.items():
        types.update(get_types_from_msg(text, name))
    store.register(types)
    return store


def read_topic(reader, topic):
    conns = [c for c in reader.connections if c.topic == topic]
    if not conns:
        available = '\n  '.join(sorted({f'{c.topic}  [{c.msgtype}]' for c in reader.connections}))
        sys.exit(f'Topic {topic!r} not found. Topics in this bag:\n  {available}')
    for conn, stamp, raw in reader.messages(connections=conns):
        yield conn.msgtype, stamp * 1e-9, reader.deserialize(raw, conn.msgtype)


def read_poses(reader, topic):
    t, xy, twist = [], [], []
    for msgtype, stamp, msg in read_topic(reader, topic):
        if msgtype.endswith('Odometry'):
            p = msg.pose.pose.position
            twist.append(msg.twist.twist.linear.x)
        elif msgtype.endswith('PoseWithCovarianceStamped'):
            p = msg.pose.pose.position
        elif msgtype.endswith('PoseStamped'):
            p = msg.pose.position
        else:
            sys.exit(f'Unsupported pose type {msgtype} on {topic}')
        t.append(stamp)
        xy.append((p.x, p.y))
    if len(t) < 20:
        sys.exit(f'Only {len(t)} pose messages on {topic}; need more to find a lap.')
    twist = np.array(twist) if len(twist) == len(t) else None
    return np.array(t), np.array(xy), twist


def read_speed(reader, topic):
    t, v = [], []
    for msgtype, stamp, msg in read_topic(reader, topic):
        if msgtype.endswith('AckermannDriveStamped'):
            v.append(msg.drive.speed)
        elif msgtype.endswith('Odometry'):
            v.append(msg.twist.twist.linear.x)
        else:
            sys.exit(f'Unsupported speed type {msgtype} on {topic}')
        t.append(stamp)
    return np.array(t), np.array(v)


def read_mode(reader, topic):
    t, m = [], []
    for _, stamp, msg in read_topic(reader, topic):
        t.append(stamp)
        m.append(str(msg.data))
    return np.array(t), m


def find_lap(t, xy, start, end, min_lap, close):
    """Return (i0, i1) indices of one closed lap."""
    if end is not None:
        i0 = int(np.searchsorted(t, t[0] + start))
        i1 = int(np.searchsorted(t, t[0] + end)) - 1
        return i0, i1
    step = np.r_[0.0, np.hypot(*np.diff(xy, axis=0).T)]
    moving = np.where((t >= t[0] + start) & (step > 1e-3))[0]
    if not len(moving):
        sys.exit('The car never moves after --start; check the topic or the start time.')
    i0 = int(moving[0])
    dist = np.cumsum(step[i0:])
    back = np.hypot(*(xy[i0:] - xy[i0]).T)
    done = np.where((dist >= min_lap) & (back <= close))[0]
    if not len(done):
        sys.exit(f'No closed lap found (travelled {dist[-1]:.1f} m without returning within {close} m of '
                 f'the start). Try --close, --min-lap, or set --start/--end by hand.')
    # Walk to the closest approach to the start point within that window.
    j = done[0]
    while j + 1 < len(back) and back[j + 1] < back[j]:
        j += 1
    return i0, i0 + int(j)


def smooth(x, n=5):
    if len(x) < n:
        return x
    k = np.ones(n) / n
    return np.convolve(np.pad(x, (n // 2, n // 2), mode='edge'), k, mode='valid')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('bag', type=Path, help='bag directory (ROS 2) or .bag file (ROS 1)')
    ap.add_argument('--pose-topic', default='/pf/pose/odom', help='default: /pf/pose/odom (ARCUS particle filter)')
    ap.add_argument('--speed-topic')
    ap.add_argument('--mode-topic')
    ap.add_argument('--start', type=float, default=0.0, help='seconds from bag start to begin searching')
    ap.add_argument('--end', type=float, help='seconds from bag start; with --start, cut the lap by hand')
    ap.add_argument('--min-lap', type=float, default=15.0, help='minimum lap length in metres (default 15)')
    ap.add_argument('--close', type=float, default=0.75, help='lap closes within this many metres (default 0.75)')
    ap.add_argument('--points', type=int, default=400, help='resampled points (default 400)')
    ap.add_argument('--caption', default='Real lap replay, logged on the ARCUS car')
    ap.add_argument('--out', type=Path, default=Path(__file__).resolve().parent.parent / 'resources/data/arcus-lap.js')
    args = ap.parse_args()

    with AnyReader([args.bag], default_typestore=build_typestore()) as reader:
        t, xy, twist = read_poses(reader, args.pose_topic)
        speed = read_speed(reader, args.speed_topic) if args.speed_topic else None
        mode = read_mode(reader, args.mode_topic) if args.mode_topic else None

    i0, i1 = find_lap(t, xy, args.start, args.end, args.min_lap, args.close)
    t, xy = t[i0:i1 + 1], xy[i0:i1 + 1]
    lap_time = float(t[-1] - t[0])

    if speed is not None:
        v = np.interp(t, *speed)
    elif twist is not None and np.any(np.abs(twist[i0:i1 + 1]) > 0.05):
        v = twist[i0:i1 + 1]
    else:
        v = smooth(np.gradient(np.r_[0.0, np.cumsum(np.hypot(*np.diff(xy, axis=0).T))], t))
    v = np.abs(v)

    # Resample evenly by arc length.
    cum = np.r_[0.0, np.cumsum(np.hypot(*np.diff(xy, axis=0).T))]
    s = np.linspace(0, cum[-1], args.points, endpoint=False)
    rx, ry, rv = np.interp(s, cum, xy[:, 0]), np.interp(s, cum, xy[:, 1]), np.interp(s, cum, v)
    rt = np.interp(s, cum, t)
    points = [[round(float(a), 3), round(float(b), 3), round(float(c), 2)] for a, b, c in zip(rx, ry, rv)]
    if mode is not None:
        mt, ml = mode
        for p, ti in zip(points, rt):
            k = int(np.searchsorted(mt, ti, side='right')) - 1
            if k >= 0:
                p.append(ml[k])

    data = {
        'caption': args.caption,
        'lap_time': round(lap_time, 2),
        'distance_m': round(float(cum[-1]), 2),
        'top_speed': round(float(rv.max()), 2),
        'avg_speed': round(float(cum[-1] / lap_time), 2),
        'points': points,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text('// Generated by tools/bag_to_lap.py. Do not edit by hand.\n'
                        f'window.ARCUS_LAP = {json.dumps(data, separators=(",", ":"))};\n')

    print(f'Lap: {lap_time:.2f} s · {cum[-1]:.1f} m · top {rv.max():.2f} m/s · avg {cum[-1] / lap_time:.2f} m/s')
    print(f'Wrote {args.out} ({args.out.stat().st_size // 1024} KB)')
    print('Enable it by adding this line before telemetry.js in charlesMcCabe.html:')
    print('  <script src="resources/data/arcus-lap.js"></script>')


if __name__ == '__main__':
    main()
