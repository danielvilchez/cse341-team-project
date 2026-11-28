const hookUsersAdmin = async () => {
    const rootEl = document.getElementById('users-admin');
    const listEl = document.getElementById('users-list');
    const templateEl = document.getElementById('user-card-template');
    const loadingEl = document.getElementById('users-loading');
    const emptyEl = document.getElementById('users-empty');
    const errorEl = document.getElementById('users-error');
    const errorMessageEl = document.getElementById('users-error-message');
    const retryEl = document.getElementById('users-retry');
    const messageEl = document.getElementById('users-message');
    const searchForm = document.getElementById('users-search-form');
    const searchInput = document.getElementById('users-search-input');
    const toolbarEl = document.getElementById('users-toolbar');
    const cardsButton = document.getElementById('users-cards-button');
    const listButton = document.getElementById('users-list-button');
    const paginationEl = document.getElementById('users-pagination');
    const previousPageButton = document.getElementById('users-previous-page');
    const nextPageButton = document.getElementById('users-next-page');
    const pageStatusEl = document.getElementById('users-page-status');
    const deleteDialog = document.getElementById('user-delete-dialog');
    const deleteForm = document.getElementById('user-delete-form');
    const deleteUserName = document.getElementById('delete-user-name');
    const deletePasswordInput = document.getElementById('delete-user-password');
    const deleteErrorEl = document.getElementById('delete-user-error');
    const cancelDeleteButton = document.getElementById('cancel-user-delete');

    if (!rootEl || !listEl || !templateEl || !loadingEl || !emptyEl
        || !errorEl || !errorMessageEl || !retryEl || !messageEl
        || !paginationEl || !previousPageButton
        || !nextPageButton || !pageStatusEl || !deleteDialog || !deleteForm
        || !deleteUserName || !deletePasswordInput || !deleteErrorEl
        || !cancelDeleteButton) {
        return;
    }

    const PAGE_SIZE = 10;
    const currentUserId = rootEl.dataset.currentUserId;
    let canEditRoles = rootEl.dataset.canEditRoles === 'true';
    let users = [];
    let currentPage = 1;
    let totalPages = 0;
    let totalUsers = 0;
    let currentQuery = '';
    let viewMode = canEditRoles ? 'cards' : 'list';
    let pendingDeleteUser = null;

    const setLoadState = (state) => {
        loadingEl.hidden = state !== 'loading';
        emptyEl.hidden = state !== 'empty';
        errorEl.hidden = state !== 'error';
        listEl.hidden = state !== 'loaded';
        paginationEl.hidden = state !== 'loaded' || totalPages <= 1;
    };

    const showMessage = (message) => {
        messageEl.textContent = message;
        messageEl.hidden = false;
        errorEl.hidden = true;
    };

    const showError = (error) => {
        console.error('Error managing users:', error);
        errorMessageEl.textContent = error.message || 'Unable to complete the request.';
        messageEl.hidden = true;
        errorEl.hidden = false;
    };

    const responseError = async (response) => {
        let payload;
        try {
            payload = await response.json();
        } catch {
            return new Error(`Request failed (${response.status}).`);
        }
        const message = payload && typeof payload.message === 'string'
            ? payload.message
            : `Request failed (${response.status}).`;
        return new Error(message);
    };

    const updateView = (mode) => {
        if (!canEditRoles) {
            mode = 'list';
        }
        viewMode = mode;
        listEl.dataset.view = mode;
        if (cardsButton && listButton) {
            cardsButton.setAttribute('aria-pressed', String(mode === 'cards'));
            listButton.setAttribute('aria-pressed', String(mode === 'list'));
        }
    };

    const updatePagination = () => {
        pageStatusEl.textContent = `Page ${currentPage} of ${totalPages} (${totalUsers} users)`;
        previousPageButton.disabled = currentPage <= 1;
        nextPageButton.disabled = currentPage >= totalPages;
    };

    const createUserCard = (user) => {
        const card = templateEl.content.cloneNode(true);
        const detailsEl = card.querySelector('[data-field="details"]');
        const actionsEl = card.querySelector('[data-field="actions"]');
        const nameEl = card.querySelector('[data-field="name"]');
        const usernameEl = card.querySelector('[data-field="username"]');
        const emailEl = card.querySelector('[data-field="email"]');
        const roleDetailsEl = card.querySelector('[data-field="role-details"]');
        const roleEl = card.querySelector('[data-field="role"]');
        const nameInput = card.querySelector('[data-field="name-input"]');
        const usernameInput = card.querySelector('[data-field="username-input"]');
        const emailInput = card.querySelector('[data-field="email-input"]');
        const passwordInput = card.querySelector('[data-field="password-input"]');
        const roleInput = card.querySelector('[data-field="role-input"]');
        const roleControl = card.querySelector('[data-field="role-control"]');
        const form = card.querySelector('form[data-action="update"]');
        const editButton = card.querySelector('button[data-action="edit"]');
        const deleteButton = card.querySelector('button[data-action="delete"]');
        const cancelEditButton = card.querySelector('button[data-action="cancel-edit"]');

        nameEl.textContent = user.name;
        usernameEl.textContent = user.username;
        emailEl.textContent = user.email;
        if (roleEl) {
            roleEl.textContent = user.role;
        }
        if (roleDetailsEl) {
            roleDetailsEl.hidden = !canEditRoles;
        }
        nameInput.value = user.name;
        usernameInput.value = user.username;
        emailInput.value = user.email;
        if (roleInput) {
            roleInput.value = user.role;
        }
        if (roleControl) {
            roleControl.hidden = !canEditRoles;
        }

        editButton.addEventListener('click', () => {
            detailsEl.hidden = true;
            actionsEl.hidden = true;
            form.hidden = false;
            nameInput.focus();
        });

        cancelEditButton.addEventListener('click', () => {
            form.hidden = true;
            detailsEl.hidden = false;
            actionsEl.hidden = false;
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const updates = {
                name: nameInput.value,
                username: usernameInput.value,
                email: emailInput.value
            };
            if (passwordInput.value) {
                updates.password = passwordInput.value;
            }
            if (canEditRoles && roleInput) {
                updates.role = roleInput.value;
            }

            try {
                const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                if (!response.ok) {
                    throw await responseError(response);
                }

                const payload = await response.json();
                if (!payload || !payload.user || !payload.user.id) {
                    throw new Error('The updated user response is invalid.');
                }

                if (canEditRoles && payload.user.id === currentUserId && payload.user.role !== 'admin') {
                    canEditRoles = false;
                    currentQuery = '';
                    currentPage = 1;
                    if (searchForm) {
                        searchForm.hidden = true;
                    }
                    if (toolbarEl) {
                        toolbarEl.hidden = true;
                    }
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    users = [payload.user];
                    totalUsers = 1;
                    totalPages = 1;
                    renderUsers(users);
                } else {
                    if (!await loadUsers()) {
                        return;
                    }
                }
                showMessage('User updated successfully.');
            } catch (error) {
                showError(error);
            }
        });

        deleteButton.addEventListener('click', () => {
            pendingDeleteUser = user;
            deleteUserName.textContent = `${user.name} (@${user.username})`;
            deletePasswordInput.value = '';
            deleteErrorEl.textContent = '';
            deleteErrorEl.hidden = true;
            deleteDialog.showModal();
            deletePasswordInput.focus();
        });

        return card;
    };

    function renderUsers(nextUsers) {
        users = nextUsers;
        if (users.length === 0) {
            listEl.replaceChildren();
            setLoadState('empty');
            return;
        }

        const fragment = document.createDocumentFragment();
        users.forEach((user) => fragment.appendChild(createUserCard(user)));
        listEl.replaceChildren(fragment);
        updateView(viewMode);
        updatePagination();
        setLoadState('loaded');
    }

    const loadUsers = async (page = currentPage, search = currentQuery) => {
        setLoadState('loading');
        messageEl.hidden = true;

        const params = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_SIZE)
        });
        if (search) {
            params.set('q', search);
        }

        try {
            const response = await fetch(`/api/users?${params.toString()}`);
            if (!response.ok) {
                throw await responseError(response);
            }

            const payload = await response.json();
            const pagination = payload && payload.pagination;
            if (
                !payload ||
                !Array.isArray(payload.users) ||
                !pagination ||
                !Number.isInteger(pagination.page) ||
                !Number.isInteger(pagination.totalItems) ||
                !Number.isInteger(pagination.totalPages)
            ) {
                throw new Error('The users response is invalid.');
            }

            if (page > 1 && page > pagination.totalPages) {
                return await loadUsers(Math.max(1, pagination.totalPages), search);
            }

            currentPage = pagination.page;
            totalPages = pagination.totalPages;
            totalUsers = pagination.totalItems;
            currentQuery = search;
            renderUsers(payload.users);
            return true;
        } catch (error) {
            showError(error);
            setLoadState('error');
            return false;
        }
    };

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            currentQuery = searchInput.value.trim();
            currentPage = 1;
            await loadUsers();
        });
    }

    if (cardsButton && listButton) {
        cardsButton.addEventListener('click', () => updateView('cards'));
        listButton.addEventListener('click', () => updateView('list'));
    }
    previousPageButton.addEventListener('click', async () => {
        if (currentPage > 1) {
            await loadUsers(currentPage - 1);
        }
    });
    nextPageButton.addEventListener('click', async () => {
        if (currentPage < totalPages) {
            await loadUsers(currentPage + 1);
        }
    });
    retryEl.addEventListener('click', async () => loadUsers());
    cancelDeleteButton.addEventListener('click', () => {
        deleteDialog.close();
    });
    deleteDialog.addEventListener('close', () => {
        deletePasswordInput.value = '';
        pendingDeleteUser = null;
        deleteErrorEl.textContent = '';
        deleteErrorEl.hidden = true;
    });

    deleteForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!pendingDeleteUser || !deletePasswordInput.value) {
            return;
        }

        const targetUser = pendingDeleteUser;
        const password = deletePasswordInput.value;
        deleteErrorEl.hidden = true;

        try {
            const response = await fetch(`/api/users/${encodeURIComponent(targetUser.id)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (!response.ok) {
                throw await responseError(response);
            }

            deleteDialog.close();
            deletePasswordInput.value = '';
            pendingDeleteUser = null;
            if (targetUser.id === currentUserId) {
                window.location.assign('/login');
                return;
            }

            const newTotal = Math.max(0, totalUsers - 1);
            const lastAvailablePage = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
            const page = Math.min(currentPage, lastAvailablePage);
            currentPage = page;
            const refreshed = await loadUsers(page, currentQuery);
            if (refreshed) {
                showMessage('User deleted successfully.');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            deleteErrorEl.textContent = error.message || 'Unable to delete the user.';
            deleteErrorEl.hidden = false;
            deletePasswordInput.value = '';
            deletePasswordInput.focus();
        }
    });

    updateView(viewMode);
    await loadUsers();
};

document.addEventListener('DOMContentLoaded', hookUsersAdmin);
