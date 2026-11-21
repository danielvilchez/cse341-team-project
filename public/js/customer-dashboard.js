
const hookCustomerDashboard = async () => {
    const containerEl = document.getElementById('bookings-container');

    if (!containerEl) {
        return;
    }

    const showMessage = (message) => {
        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        containerEl.replaceChildren(messageEl);
    };

    const formatDate = (value) => {
        if (!value) {
            return 'Not available';
        }

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? 'Not available'
            : date.toLocaleString();
    };

    const renderBookings = (bookings) => {
        if (bookings.length === 0) {
            showMessage('You do not have any bookings yet.');
            return;
        }

        const fragment = document.createDocumentFragment();

        bookings.forEach((booking) => {
            const card = document.createElement('article');
            const title = document.createElement('h3');
            const details = document.createElement('p');

            const passengers = Array.isArray(booking.passengers)
                ? booking.passengers
                : [];

            const passengerNames = passengers.map((passenger) => (
                [passenger.firstName, passenger.lastName]
                    .filter(Boolean)
                    .join(' ')
            )).filter(Boolean);

            title.textContent = `Booking ${booking.id || 'Not available'}`;

            details.textContent = [
                `Trip: ${booking.tripId || 'Not available'}`,
                `Schedule: ${booking.scheduleId || 'Not available'}`,
                `Ticket class: ${booking.ticketClass || 'Not available'}`,
                `Travel day: ${booking.selectedDay || 'Not available'}`,
                `Passengers: ${passengerNames.join(', ') || 'Not available'}`,
                `Created: ${formatDate(booking.createdAt)}`
            ].join(' | ');

            card.append(title, details);
            fragment.appendChild(card);
        });

        containerEl.replaceChildren(fragment);
    };

    const loadBookings = async () => {
        showMessage('Loading your bookings...');

        try {
            const response = await fetch('/api/my-bookings');

            if (response.status === 401) {
                showMessage('Please log in to view your bookings.');
                return;
            }

            if (response.status === 403) {
                showMessage('You do not have permission to view these bookings.');
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to load bookings (${response.status})`);
            }

            const payload = await response.json();

            if (!payload || !Array.isArray(payload.bookings)) {
                throw new Error('The bookings response is invalid.');
            }

            renderBookings(payload.bookings);
        } catch (error) {
            console.error('Error loading customer bookings:', error);
            showMessage('Unable to load your bookings. Please try again later.');
        }
    };

    await loadBookings();
};

document.addEventListener('DOMContentLoaded', hookCustomerDashboard);
