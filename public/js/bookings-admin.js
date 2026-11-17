const hookBookingsAdmin = async () => {
    const listEl = document.getElementById('bookings-list');
    const templateEl = document.getElementById('booking-card-template');
    const cardsViewEl = document.getElementById('bookings-cards-view');
    const tableListEl = document.getElementById('bookings-table-list');
    const tableWrapEl = document.getElementById('bookings-table-wrap');
    const viewControlsEl = document.getElementById('bookings-view-controls');
    const cardsButtonEl = document.getElementById('bookings-cards-button');
    const tableButtonEl = document.getElementById('bookings-table-button');
    const loadingEl = document.getElementById('bookings-loading');
    const emptyEl = document.getElementById('bookings-empty');
    const errorEl = document.getElementById('bookings-error');
    const retryEl = document.getElementById('bookings-retry');

    if (!listEl || !templateEl || !cardsViewEl || !tableListEl || !tableWrapEl
        || !viewControlsEl || !cardsButtonEl || !tableButtonEl
        || !loadingEl || !emptyEl || !errorEl) {
        return;
    }

    let activeView = 'cards';

    const setView = (view) => {
        activeView = view;
        cardsViewEl.hidden = view !== 'cards';
        tableWrapEl.hidden = view !== 'table';
        cardsButtonEl.setAttribute('aria-pressed', String(view === 'cards'));
        tableButtonEl.setAttribute('aria-pressed', String(view === 'table'));
    };

    const setState = (state) => {
        loadingEl.hidden = state !== 'loading';
        emptyEl.hidden = state !== 'empty';
        errorEl.hidden = state !== 'error';
        viewControlsEl.hidden = state !== 'loaded';
        if (state === 'loaded') {
            setView(activeView);
        } else {
            cardsViewEl.hidden = true;
            tableWrapEl.hidden = true;
        }
    };

    const addCell = (row, value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
    };

    const formatDate = (value) => {
        if (!value) {
            return 'Not available';
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
    };

    const renderBookings = (bookings) => {
        if (bookings.length === 0) {
            listEl.replaceChildren();
            setState('empty');
            return;
        }

        const cardsFragment = document.createDocumentFragment();
        const tableFragment = document.createDocumentFragment();
        bookings.forEach((booking) => {
            const card = templateEl.content.cloneNode(true);
            const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
            const passengerNames = passengers.map((passenger) => (
                [passenger.firstName, passenger.lastName].filter(Boolean).join(' ')
            )).filter(Boolean);
            const passengerSummary = passengerNames.join(', ') || `${passengers.length} passenger(s)`;
            const createdAt = formatDate(booking.createdAt);

            card.querySelector('[data-field="booking-id"]').textContent = booking.id || 'Not available';
            card.querySelector('[data-field="ticket-class"]').textContent = booking.ticketClass || 'Not available';
            card.querySelector('[data-field="trip"]').textContent = booking.tripId || 'Not available';
            card.querySelector('[data-field="schedule"]').textContent = booking.scheduleId || 'Not available';
            card.querySelector('[data-field="travel-day"]').textContent = booking.selectedDay || 'Not available';
            card.querySelector('[data-field="passengers"]').textContent = passengerSummary;
            card.querySelector('[data-field="created"]').textContent = createdAt;
            cardsFragment.appendChild(card);

            const row = document.createElement('tr');
            addCell(row, booking.id || 'Not available');
            addCell(row, booking.tripId || 'Not available');
            addCell(row, booking.scheduleId || 'Not available');
            addCell(row, booking.ticketClass || 'Not available');
            addCell(row, booking.selectedDay || 'Not available');
            addCell(row, passengerSummary);
            addCell(row, createdAt);
            tableFragment.appendChild(row);
        });

        listEl.replaceChildren(cardsFragment);
        tableListEl.replaceChildren(tableFragment);
        setState('loaded');
    };

    const loadBookings = async () => {
        setState('loading');

        try {
            const response = await fetch('/api/bookings');
            if (!response.ok) {
                throw new Error(`Failed to load bookings (${response.status})`);
            }

            const payload = await response.json();
            if (!payload || !Array.isArray(payload.bookings)) {
                throw new Error('The bookings response is invalid.');
            }

            renderBookings(payload.bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            setState('error');
        }
    };

    if (retryEl) {
        retryEl.addEventListener('click', loadBookings);
    }
    cardsButtonEl.addEventListener('click', () => setView('cards'));
    tableButtonEl.addEventListener('click', () => setView('table'));

    await loadBookings();
};

document.addEventListener('DOMContentLoaded', hookBookingsAdmin);
