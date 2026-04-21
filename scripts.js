// Project modal data
const projectData = {
    arcus: {
        title: 'ARCUS — Roboracer Vienna 2026',
        type: 'Autonomous vehicle · Ongoing',
        description: 'ARCUS is an autonomous racing vehicle competing at Roboracer ICRA 2026 in Vienna. I implemented core localization and control algorithms including SLAM for real-time mapping, particle filtering for robust state estimation, and pure pursuit++ trajectory tracking. The full autonomous driving stack was developed using ROS2 on Linux, enabling real-time perception and decision-making at racing speeds.',
        technologies: ['ROS2', 'SLAM', 'Particle Filter', 'Pure Pursuit++', 'Linux', 'C++', 'Autonomous Navigation'],
        links: [
            { name: 'View on GitHub', url: 'https://github.com/robotique-udes/arcus' },
            { name: 'Team LinkedIn', url: 'https://www.linkedin.com/company/arcus-project/' }
        ]
    },
    sherbee: {
        title: 'Sherbee',
        type: 'Entrepreneurial project · Ongoing',
        description: 'Sherbee is a startup developing audio-powered varroa mite detection technology for beekeepers. I contributed to product development, built the marketing website, developed strategic partnerships with beekeepers and agricultural organizations, and helped secure grants and external funding. This project combines embedded systems, signal processing, and business development.',
        technologies: ['Web Development', 'Signal Processing', 'IoT', 'Embedded Systems', 'Business Strategy'],
        links: [
            { name: 'Visit Website', url: 'https://sherbee.ca' },
            { name: 'Company LinkedIn', url: 'https://www.linkedin.com/company/sherbee/' }
        ]
    },
    ballbalancer: {
        title: 'Ball balancing robot',
        type: 'Mechatronics',
        description: 'A complete electromechanical system designed and built from scratch. The project spans mechanical design (frame and linkage), PCB design with custom electronics, and real-time control software. I integrated a Raspberry Pi 5 with stepper motor drivers for precise actuation and implemented closed-loop visual control using OpenCV for real-time ball position detection and servo loop compensation.',
        technologies: ['Raspberry Pi 5', 'Stepper Motors', 'OpenCV', 'PCB Design', 'Real-time Control', 'Python'],
        links: [
            { name: 'Watch Demo', url: 'https://www.youtube.com/shorts/rVlpZmMtKw4' },
            { name: 'View CAD in Onshape', url: 'https://cad.onshape.com/documents/8632da1a62aee0745924fd5b/w/012cad01de5451e598a468e9/e/7d93e9c7a08a21e8eda356c5' }
        ]
    },
    vlogus: {
        title: 'Vlogus',
        type: 'Computer Vision · Web',
        description: 'An intelligent cameraman robot with real-time face tracking and live video streaming capabilities. The system autonomously follows and tracks subjects during filming, enabling hands-free cinematic recording. Built with computer vision algorithms for robust face detection and tracking, combined with robotic servo control for smooth camera movement.',
        technologies: ['Computer Vision', 'Face Detection/Tracking', 'Robotics', 'OpenCV', 'Real-time Processing', 'Python'],
        links: [
            { name: 'View on GitHub', url: 'https://github.com/vlogUS-s4/VlogUS' },
            { name: 'Watch Demo', url: 'https://youtube.com/shorts/SqjVvZrrfgw' }
        ]
    },
    huski: {
        title: 'Avalanche rescue robot',
        type: 'Mobile robotics',
        description: 'A proof-of-concept thermal detection robot designed for avalanche rescue operations. The system features tracked propulsion for terrain navigation and integrated thermal sensing for victim detection. Nearly all structural components were 3D-printed, demonstrating rapid prototyping for specialized robotics applications.',
        technologies: ['Mobile Robotics', '3D Printing', 'Thermal Imaging', 'Tracked Locomotion', 'Embedded Systems'],
        links: []
    },
    thumper: {
        title: 'Dune Thumper replica',
        type: 'Mechanical design',
        description: 'A faithful recreation of the iconic Thumper vehicle from Dune, built with authentic mechanical systems and screen-accurate proportions. The project showcases mechanical design, fabrication techniques, and engineering aesthetics. Features working mechanisms that replicate the distinctive leg motion of the original vehicle.',
        technologies: ['Mechanical Design', 'Fabrication', 'Mechanical Systems', 'CAD'],
        links: [
            { name: 'Watch Demo', url: 'https://youtube.com/shorts/60UvBixNILU' }
        ]
    },
    crc: {
        title: 'CRC competition robot',
        type: 'Competition',
        description: 'A competitive robot designed and built under the tight constraints of the CRC competition: limited budget, small team, and strict timelines. The project required full mechanical design, assembly, and integration while managing resource constraints effectively.',
        technologies: ['Mechanical Design', 'CAD', 'Project Management', 'Rapid Prototyping'],
        links: []
    },
    simulaction: {
        title: 'Simulaction',
        type: 'Web development',
        description: 'A stock market simulation website built entirely from scratch with zero prior web development experience. This project was a deep dive into full-stack web development, covering frontend design, backend architecture, database management, and user interface design. It serves as a learning platform for students interested in financial markets and trading strategies.',
        technologies: ['Web Development', 'Frontend', 'Backend', 'Database', 'JavaScript', 'Full-stack'],
        links: []
    },
    bioterra: {
        title: 'Bioterra',
        type: 'Process engineering',
        description: 'A seed-bomb production line demonstrating automated manufacturing of biodegradable seed bombs. The project showcases process engineering, automation design, and sustainable product development. It serves as a conceptual demonstration of germination technology and eco-friendly packaging materials.',
        technologies: ['Process Engineering', 'Automation', 'Manufacturing', 'Sustainability'],
        links: []
    },
    rapidus: {
        title: 'Rapidus — Robot in 3 days',
        type: 'Competition · Sprint',
        description: 'Built functional FRC competition robots in just 3 days as part of a rapid prototyping challenge. Beyond the engineering feat, I documented the entire process to create educational materials helping high-school teams replicate fast build workflows and discover new rapid development techniques. This project bridges competitive robotics with technical education.',
        technologies: ['FRC', 'Rapid Prototyping', 'Documentation', 'Team Coordination', 'Problem-solving'],
        links: [
            { name: 'Watch Reveal', url: 'https://youtu.be/5d347xy3TyQ' }
        ]
    }
};

// Modal functionality
const modal = document.getElementById('project-modal');
const modalOverlay = modal.querySelector('.modal-overlay');
const modalClose = modal.querySelector('.modal-close');
const modalLinksContainer = modal.querySelector('.modal-links');

function openModal(projectId) {
    const project = projectData[projectId];
    if (!project) return;

    // Populate modal content
    modal.querySelector('.modal-title').textContent = project.title;
    modal.querySelector('.modal-type').textContent = project.type;
    modal.querySelector('.modal-description').textContent = project.description;

    // Add technology tags
    const techTagsContainer = modal.querySelector('.tech-tags');
    techTagsContainer.innerHTML = '';
    project.technologies.forEach(tech => {
        const tag = document.createElement('span');
        tag.className = 'tech-tag';
        tag.textContent = tech;
        techTagsContainer.appendChild(tag);
    });

    // Add links
    modalLinksContainer.innerHTML = '';
    project.links.forEach(link => {
        const a = document.createElement('a');
        a.className = 'modal-link';
        a.href = link.url;
        a.textContent = link.name;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        modalLinksContainer.appendChild(a);
    });
    modalLinksContainer.hidden = project.links.length === 0;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';
}

// Event listeners for project cards
document.querySelectorAll('[data-modal]').forEach(card => {
    card.addEventListener('click', (e) => {
        // Don't open modal if clicking on a link
        if (e.target.tagName === 'A') return;
        openModal(card.dataset.modal);
    });
});

// Close modal listeners
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

// Contact form
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = contactForm.querySelector('.form-submit');
        const endpoint = contactForm.getAttribute('action');

        if (!endpoint) {
            formStatus.textContent = 'Form endpoint is missing. Please try again later.';
            formStatus.classList.remove('form-status--success');
            formStatus.classList.add('form-status--error');
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
        }

        formStatus.textContent = 'Sending your message...';
        formStatus.classList.remove('form-status--success', 'form-status--error');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: {
                    Accept: 'application/json'
                }
            });

            if (response.ok) {
                formStatus.textContent = 'Thanks, your message was sent successfully.';
                formStatus.classList.add('form-status--success');
                contactForm.reset();
            } else {
                formStatus.textContent = 'Sorry, your message could not be sent. Please try again.';
                formStatus.classList.add('form-status--error');
            }
        } catch {
            formStatus.textContent = 'Network error. Please check your connection and try again.';
            formStatus.classList.add('form-status--error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Send message →';
            }
        }
    });
}