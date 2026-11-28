import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createUser, updateUserById } from '../src/models/users.js';

const clientScript = readFileSync(new URL('../public/js/users-admin.js', import.meta.url), 'utf8');

const createAccount = async (username, role = 'customer') => {
    const user = await createUser(
        `${username} User`,
        username,
        `${username}@example.com`,
        'TestPassword123'
    );
    return role === 'admin'
        ? updateUserById(user._id.toString(), { role })
        : user;
};

const login = async (user) => {
    const agent = request.agent(app);
    await agent
        .post('/login')
        .send({ identifier: user.email, password: 'TestPassword123' })
        .expect(302);
    return agent;
};

const usersResponse = (users, total = users.length, page = 1, totalPages = (total ? 1 : 0)) => ({
    users,
    pagination: {
        page, limit: 10, totalItems: total, totalPages,
        hasNextPage: page < totalPages, hasPreviousPage: page > 1
    }
});

class MockElement {
    constructor() {
        this.hidden = false;
        this.textContent = '';
        this.children = [];
        this.listeners = {};
        this.attributes = {};
        this.dataset = {};
        this.value = '';
        this.disabled = false;
        this.open = false;
    }

    addEventListener(event, callback) {
        this.listeners[event] = callback;
    }

    appendChild(child) {
        this.children.push(...(child.isFragment ? child.children : [child]));
    }

    replaceChildren(...children) {
        this.children = children.flatMap((child) => child.isFragment ? child.children : [child]);
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }

    focus() {}

    showModal() {
        this.open = true;
    }

    close() {
        this.open = false;
        if (this.listeners.close) {
            this.listeners.close();
        }
    }
}

const makeUserCard = (withRole) => {
    const fields = {
        '[data-field="details"]': new MockElement(),
        '[data-field="actions"]': new MockElement(),
        '[data-field="name"]': new MockElement(),
        '[data-field="username"]': new MockElement(),
        '[data-field="email"]': new MockElement(),
        '[data-field="name-input"]': new MockElement(),
        '[data-field="username-input"]': new MockElement(),
        '[data-field="email-input"]': new MockElement(),
        '[data-field="password-input"]': new MockElement(),
        'form[data-action="update"]': new MockElement(),
        'button[data-action="edit"]': new MockElement(),
        'button[data-action="delete"]': new MockElement(),
        'button[data-action="cancel-edit"]': new MockElement()
    };
    if (withRole) {
        fields['[data-field="role-details"]'] = new MockElement();
        fields['[data-field="role"]'] = new MockElement();
        fields['[data-field="role-input"]'] = new MockElement();
        fields['[data-field="role-control"]'] = new MockElement();
    }
    return {
        fields,
        querySelector: (selector) => fields[selector]
    };
};

const runUsersScript = async ({ fetch, currentUserId = 'user-1', isAdmin = false }) => {
    const ids = [
        'users-admin',
        'users-list',
        'users-loading',
        'users-empty',
        'users-error',
        'users-error-message',
        'users-retry',
        'users-message',
        'users-pagination',
        'users-previous-page',
        'users-next-page',
        'users-page-status',
        'user-delete-dialog',
        'user-delete-form',
        'delete-user-name',
        'delete-user-password',
        'delete-user-error',
        'cancel-user-delete'
    ];
    const elements = Object.fromEntries(ids.map((id) => [id, new MockElement()]));
    elements['users-admin'].dataset = {
        currentUserId,
        canEditRoles: String(isAdmin)
    };
    if (isAdmin) {
        elements['users-toolbar'] = new MockElement();
        elements['users-cards-button'] = new MockElement();
        elements['users-list-button'] = new MockElement();
        elements['users-search-form'] = new MockElement();
        elements['users-search-input'] = new MockElement();
    }
    elements['user-card-template'] = {
        content: {
            cloneNode: () => makeUserCard(isAdmin)
        }
    };
    const documentEvents = {};
    const location = { assign: (path) => { location.path = path; } };
    const document = {
        getElementById: (id) => elements[id],
        createDocumentFragment: () => Object.assign(new MockElement(), { isFragment: true }),
        addEventListener: (event, callback) => {
            documentEvents[event] = callback;
        }
    };

    runInNewContext(clientScript, {
        document,
        fetch,
        console,
        URLSearchParams,
        encodeURIComponent,
        window: { location }
    });
    await documentEvents.DOMContentLoaded();
    return { elements, location };
};

const customerUser = (id = 'user-1') => ({
    id,
    name: 'Customer User',
    username: 'customer',
    email: 'customer@example.com',
    role: 'customer'
});

describe('User administration page', () => {
    test('redirects unauthenticated visitors and renders a data-free shell for customers', async () => {
        await request(app).get('/users-admin').expect(302).expect('Location', '/login');

        const customer = await createAccount('page-customer');
        const response = await (await login(customer)).get('/users-admin').expect(200);

        expect(response.text).toContain('id="users-admin"');
        expect(response.text).toContain('src="/js/users-admin.js"');
        expect(response.text).toContain('data-view="list"');
        expect(response.text).not.toContain('page-customer@example.com');
        expect(response.text).not.toContain('page-customer User');
        expect(response.text).not.toContain('id="users-search-form"');
        expect(response.text).not.toContain('id="users-cards-button"');
        expect(response.text).not.toContain('id="users-list-button"');
        expect(response.text).not.toContain('data-field="role-details"');
        expect(response.text).not.toContain('data-field="role-input"');
    });

    test('renders search and role controls only for admins', async () => {
        const admin = await createAccount('page-admin', 'admin');
        const response = await (await login(admin)).get('/users-admin').expect(200);

        expect(response.text).toContain('id="users-search-form"');
        expect(response.text).toContain('id="users-cards-button"');
        expect(response.text).toContain('id="users-list-button"');
        expect(response.text).toContain('data-field="role-input"');
        expect(response.text).toContain('data-can-edit-roles="true"');
        expect(response.text).toContain('id="user-delete-dialog"');
        expect(response.text).toContain('This action is irreversible.');
        expect(response.text).toContain("not the selected user's account.");
    });

    test('renders API users as text and displays an explicit load error', async () => {
        const { elements } = await runUsersScript({
            fetch: async () => ({
                ok: true,
                json: async () => usersResponse([{
                    ...customerUser(),
                    name: '<img src=x onerror=alert(1)>'
                }])
            })
        });

        const card = elements['users-list'].children[0];
        expect(card.fields['[data-field="name"]'].textContent)
            .toBe('<img src=x onerror=alert(1)>');
        expect(elements['users-list'].dataset.view).toBe('list');
        expect(elements['users-list'].hidden).toBe(false);
        expect(elements['users-loading'].hidden).toBe(true);

        const failed = await runUsersScript({
            fetch: async () => ({ ok: false, status: 500, json: async () => ({}) })
        });
        expect(failed.elements['users-error'].hidden).toBe(false);
        expect(failed.elements['users-error-message'].textContent).toBe('Request failed (500).');
        expect(failed.elements['users-loading'].hidden).toBe(true);
    });

    test('searches on the server and switches between card and list views', async () => {
        const requestedUrls = [];
        const { elements } = await runUsersScript({
            currentUserId: 'admin-1',
            isAdmin: true,
            fetch: async (url) => {
                requestedUrls.push(url);
                const params = new URL(url, 'http://localhost').searchParams;
                const page = Number(params.get('page'));
                return {
                    ok: true,
                    json: async () => usersResponse(
                        [customerUser(`user-${page}`)],
                        30,
                        page,
                        2
                    )
                };
            }
        });

        await elements['users-list-button'].listeners.click();
        expect(requestedUrls[0]).toContain('limit=10');
        expect(elements['users-previous-page'].disabled).toBe(true);
        expect(elements['users-list'].dataset.view).toBe('list');
        expect(elements['users-list-button'].attributes['aria-pressed']).toBe('true');

        elements['users-search-input'].value = 'Ada Lovelace';
        await elements['users-search-form'].listeners.submit({ preventDefault: () => {} });
        expect(requestedUrls[1]).toContain('q=Ada+Lovelace');
        expect(requestedUrls[1]).toContain('page=1');

        await elements['users-next-page'].listeners.click();
        expect(requestedUrls[2]).toContain('page=2');
        expect(requestedUrls[2]).toContain('q=Ada+Lovelace');
        expect(elements['users-page-status'].textContent).toBe('Page 2 of 2 (30 users)');
        expect(elements['users-next-page'].disabled).toBe(true);
        await elements['users-previous-page'].listeners.click();
        expect(requestedUrls[3]).toContain('page=1');
        expect(requestedUrls[3]).toContain('q=Ada+Lovelace');

        await elements['users-cards-button'].listeners.click();
        expect(elements['users-list'].dataset.view).toBe('cards');
    });

    test('edits users without reloading the document', async () => {
        let user = customerUser();
        let updateBody;
        const { elements } = await runUsersScript({
            fetch: async (url, options) => {
                if (url.startsWith('/api/users?')) {
                    return { ok: true, json: async () => usersResponse([user]) };
                }
                updateBody = JSON.parse(options.body);
                user = { ...user, name: 'Updated Customer' };
                return {
                    ok: true,
                    json: async () => ({ user })
                };
            }
        });

        let card = elements['users-list'].children[0];
        await card.fields['button[data-action="edit"]'].listeners.click();
        expect(card.fields['form[data-action="update"]'].hidden).toBe(false);
        card.fields['[data-field="name-input"]'].value = 'Updated Customer';
        await card.fields['form[data-action="update"]'].listeners.submit({
            preventDefault: () => {}
        });

        card = elements['users-list'].children[0];
        expect(updateBody.name).toBe('Updated Customer');
        expect(updateBody).not.toHaveProperty('role');
        expect(card.fields['[data-field="name"]'].textContent).toBe('Updated Customer');
        expect(elements['users-message'].textContent).toBe('User updated successfully.');
    });

    test.each(['edit', 'delete'])(
        'preserves search and returns to a valid page after %s removes the last result',
        async (operation) => {
            const requestedUrls = [];
            let changed = false;
            const { elements } = await runUsersScript({
                currentUserId: 'admin-1',
                isAdmin: true,
                fetch: async (url) => {
                    if (url.startsWith('/api/users?')) {
                        requestedUrls.push(url);
                        const params = new URL(url, 'http://localhost').searchParams;
                        const page = Number(params.get('page'));
                        const total = changed ? 10 : 11;
                        const totalPages = changed ? 1 : 2;
                        const users = changed && page > 1
                            ? []
                            : [customerUser(`user-${page}`)];
                        return { ok: true, json: async () => usersResponse(users, total, page, totalPages) };
                    }
                    changed = true;
                    if (operation === 'edit') {
                        return { ok: true, json: async () => ({ user: customerUser('user-2') }) };
                    }
                    return { ok: true, status: 204 };
                }
            });

            elements['users-search-input'].value = 'match';
            await elements['users-search-form'].listeners.submit({ preventDefault: () => {} });
            await elements['users-next-page'].listeners.click();
            const card = elements['users-list'].children[0];
            if (operation === 'edit') {
                await card.fields['form[data-action="update"]'].listeners.submit({ preventDefault: () => {} });
            } else {
                await card.fields['button[data-action="delete"]'].listeners.click();
                elements['delete-user-password'].value = 'password';
                await elements['user-delete-form'].listeners.submit({ preventDefault: () => {} });
            }

            const finalUrl = requestedUrls[requestedUrls.length - 1];
            expect(finalUrl).toContain('page=1');
            expect(finalUrl).toContain('q=match');
            expect(elements['users-list'].children[0].fields['[data-field="name"]'].textContent)
                .toBe('Customer User');
            expect(elements['users-error'].hidden).toBe(true);
            expect(elements['users-message'].textContent)
                .toBe(`User ${operation === 'edit' ? 'updated' : 'deleted'} successfully.`);
        }
    );

    test('hides admin results and controls when an admin changes their own role', async () => {
        const admin = { ...customerUser('admin-1'), role: 'admin' };
        const other = customerUser('other-1');
        const { elements } = await runUsersScript({
            currentUserId: admin.id,
            isAdmin: true,
            fetch: async (url) => {
                if (url.startsWith('/api/users?')) {
                    return { ok: true, json: async () => usersResponse([admin, other]) };
                }
                return { ok: true, json: async () => ({ user: { ...admin, role: 'customer' } }) };
            }
        });

        const card = elements['users-list'].children[0];
        card.fields['[data-field="role-input"]'].value = 'customer';
        await card.fields['form[data-action="update"]'].listeners.submit({ preventDefault: () => {} });

        expect(elements['users-list'].children).toHaveLength(1);
        expect(elements['users-search-form'].hidden).toBe(true);
        expect(elements['users-toolbar'].hidden).toBe(true);
        expect(elements['users-list'].dataset.view).toBe('list');
        expect(elements['users-list'].children[0].fields['[data-field="role-control"]'].hidden).toBe(true);
    });

    test('requires a password in the deletion dialog and removes other users in place', async () => {
        const admin = {
            id: 'admin-1',
            name: 'Admin User',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin'
        };
        const customer = customerUser('customer-1');
        let deletedBody;
        let deleteDone = false;
        const { elements } = await runUsersScript({
            currentUserId: admin.id,
            isAdmin: true,
            fetch: async (url, options) => {
                if (url.startsWith('/api/users?')) {
                    return {
                        ok: true,
                        json: async () => usersResponse(deleteDone ? [admin] : [admin, customer], deleteDone ? 1 : 2)
                    };
                }
                deletedBody = JSON.parse(options.body);
                deleteDone = true;
                return { ok: true, status: 204 };
            }
        });

        const customerCard = elements['users-list'].children[1];
        await customerCard.fields['button[data-action="delete"]'].listeners.click();
        expect(elements['user-delete-dialog'].open).toBe(true);
        expect(elements['delete-user-name'].textContent).toBe('Customer User (@customer)');

        elements['delete-user-password'].value = 'AdminCurrentPassword';
        await elements['user-delete-form'].listeners.submit({ preventDefault: () => {} });

        expect(deletedBody).toEqual({ password: 'AdminCurrentPassword' });
        expect(elements['users-list'].children).toHaveLength(1);
        expect(elements['users-list'].children[0].fields['[data-field="name"]'].textContent)
            .toBe('Admin User');
        expect(elements['users-message'].textContent).toBe('User deleted successfully.');
        expect(elements['delete-user-password'].value).toBe('');
    });

    test('redirects after self-deletion and keeps failed deletions in the confirmation dialog', async () => {
        let failDelete = true;
        const { elements, location } = await runUsersScript({
            fetch: async (url) => {
                if (url.startsWith('/api/users?')) {
                    return { ok: true, json: async () => usersResponse([customerUser()]) };
                }
                if (failDelete) {
                    return {
                        ok: false,
                        status: 403,
                        json: async () => ({ message: 'Current password is incorrect.' })
                    };
                }
                return { ok: true, status: 204 };
            }
        });

        const deleteButton = elements['users-list'].children[0]
            .fields['button[data-action="delete"]'];
        await deleteButton.listeners.click();
        elements['delete-user-password'].value = 'wrong-password';
        await elements['user-delete-form'].listeners.submit({ preventDefault: () => {} });
        expect(elements['delete-user-error'].hidden).toBe(false);
        expect(elements['delete-user-error'].textContent).toBe('Current password is incorrect.');
        expect(elements['user-delete-dialog'].open).toBe(true);

        failDelete = false;
        await deleteButton.listeners.click();
        elements['delete-user-password'].value = 'correct-password';
        await elements['user-delete-form'].listeners.submit({ preventDefault: () => {} });
        expect(location.path).toBe('/login');
    });
});
