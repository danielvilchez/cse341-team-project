
const hookRegionSorter = () => {
    const regionSelect = document.getElementById('region-filter');
    if (regionSelect) {
        regionSelect.addEventListener('change', () => {
            const selectedRegion = regionSelect.value;
            const url = new URL(window.location.href);

            if (selectedRegion && selectedRegion !== 'all') {
                url.searchParams.set('region', selectedRegion);
            } else {
                url.searchParams.delete('region');
            }

            window.location.href = url.toString();
        });
    }
};

const hookSeasonSorter = () => {
    const seasonSelect = document.getElementById('season-filter');
    if (seasonSelect) {
        seasonSelect.addEventListener('change', () => {
            const selectedSeason = seasonSelect.value;
            const url = new URL(window.location.href);

            if (selectedSeason && selectedSeason !== 'all') {
                url.searchParams.set('season', selectedSeason);
            } else {
                url.searchParams.delete('season');
            }

            window.location.href = url.toString();
        });
    }
};

const hookTrainsCatalog = async () => {
    const listEl = document.getElementById('trains-list');
    const templateEl = document.getElementById('train-card-template');
    const loadingEl = document.getElementById('trains-loading');
    const errorEl = document.getElementById('trains-error');

    if (!listEl || !templateEl) {
        return;
    }

    try {
        const response = await fetch('/api/trains');
        if (!response.ok) {
            throw new Error(`Failed to load trains (${response.status})`);
        }

        const payload = await response.json();
        const trains = payload.trains || [];
        const fragment = document.createDocumentFragment();

        trains.forEach((train) => {
            const card = templateEl.content.cloneNode(true);
            const imageEl = card.querySelector('[data-field="image"]');

            imageEl.src = train.imageUrl;
            imageEl.alt = train.imageAlt || `${train.name} train`;

            card.querySelector('[data-field="name"]').textContent = train.name;
            card.querySelector('[data-field="operator"]').textContent = train.operator;
            card.querySelector('[data-field="type"]').textContent = train.type;
            card.querySelector('[data-field="speed"]').textContent = `${train.maxSpeedKmh} km/h`;
            card.querySelector('[data-field="seats"]').textContent = `${train.capacity} seats`;
            card.querySelector('[data-field="power"]').textContent = train.powerSource;
            card.querySelector('[data-field="description"]').textContent = train.description;
            card.querySelector('[data-field="best-for"]').textContent = train.bestFor;

            fragment.appendChild(card);
        });

        listEl.replaceChildren(fragment);
        if (loadingEl) {
            loadingEl.hidden = true;
        }
    } catch (error) {
        if (loadingEl) {
            loadingEl.hidden = true;
        }
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = 'Unable to load trains right now. Please try again in a moment.';
        }
    }
};

const hookTripSchedules = () => {
    const schedulesSection = document.getElementById('route-schedules');
    const monthSelect = document.getElementById('schedule-month');
    const schedulesGrid = document.getElementById('schedules-grid');
    const loadingEl = document.getElementById('schedules-loading');
    const emptyEl = document.getElementById('schedules-empty');
    const errorEl = document.getElementById('schedules-error');

    if (!schedulesSection || !monthSelect || !schedulesGrid) {
        return;
    }

    const tripId = schedulesSection.dataset.tripId;

    const loadSchedules = async () => {
        loadingEl.hidden = false;
        emptyEl.hidden = true;
        errorEl.hidden = true;
        schedulesGrid.replaceChildren();

        try {
            const month = monthSelect.value;

            const response = await fetch(
                `/api/trips/${encodeURIComponent(tripId)}/schedules?month=${encodeURIComponent(month)}`
            );

            if (!response.ok) {
                throw new Error(`Failed to load schedules (${response.status})`);
            }

            const schedules = await response.json();

            loadingEl.hidden = true;

            if (schedules.length === 0) {
                emptyEl.hidden = false;
                return;
            }

            schedules.forEach((schedule) => {
                const card = document.createElement('div');
                card.className = 'schedule-card';

                const times = document.createElement('div');
                times.className = 'schedule-times';

                const departure = document.createElement('div');
                departure.className = 'time-block';

                const departureLabel = document.createElement('span');
                departureLabel.className = 'time-label';
                departureLabel.textContent = 'Departs';

                const departureTime = document.createElement('span');
                departureTime.className = 'time-value';
                departureTime.textContent = schedule.departureTime;

                departure.append(departureLabel, departureTime);

                const arrow = document.createElement('span');
                arrow.className = 'time-arrow';
                arrow.textContent = '→';

                const arrival = document.createElement('div');
                arrival.className = 'time-block';

                const arrivalLabel = document.createElement('span');
                arrivalLabel.className = 'time-label';
                arrivalLabel.textContent = 'Arrives';

                const arrivalTime = document.createElement('span');
                arrivalTime.className = 'time-value';
                arrivalTime.textContent = schedule.arrivalTime;

                arrival.append(arrivalLabel, arrivalTime);

                times.append(departure, arrow, arrival);

                const days = document.createElement('div');
                days.className = 'schedule-days';

                schedule.daysOfWeek.forEach((day) => {
                    const dayBadge = document.createElement('span');
                    dayBadge.className = 'day-badge';
                    dayBadge.textContent = day.substring(0, 3);
                    days.appendChild(dayBadge);
                });

                const bookLink = document.createElement('a');
                bookLink.href = `/trips/booking/${encodeURIComponent(schedule.id)}`;
                bookLink.className = 'book-btn';
                bookLink.textContent = 'Book Now';

                card.append(times, days, bookLink);
                schedulesGrid.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading schedules:', error);
            loadingEl.hidden = true;
            errorEl.hidden = false;
        }
    };

    monthSelect.addEventListener('change', loadSchedules);
    loadSchedules();
};

document.addEventListener('DOMContentLoaded', () => {
    hookRegionSorter();
    hookSeasonSorter();
    hookTrainsCatalog();
    hookTripSchedules();
});
