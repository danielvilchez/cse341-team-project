# Feature Set 2: User Dashboard and Navigation

## 1. Overview

The goal of this feature set is to improve the user experience in Kizuna Rail by providing a personalized dashboard for standard users and navigation links based on authentication status and user role.

The standard user dashboard will display a welcome message using the authenticated user's display name and dynamically load bookings associated with the user's email address.

The dashboard will also provide links to the Booking Admin page and User Admin page.

The application header will display navigation options according to whether the user is signed in or signed out. Administrators and standard users will be directed to their respective dashboards.

## 2. Scope

This feature set includes:

- Creating a protected standard user dashboard.
- Displaying the authenticated user's name.
- Loading the user's bookings dynamically through a client-side API request.
- Showing only bookings where at least one passenger's email matches the authenticated user's email.
- Providing links to the Booking Admin and User Admin pages.
- Displaying navigation links according to authentication status and user role.
- Verifying the existing login redirects and correcting them only if necessary.

## 3. Data, Session, and User Roles

### User data

The application uses the User model, which contains:

- `name`: the user's display name.
- `username`: the user's username.
- `email`: the user's email address.
- `passwordHash`: the encrypted password.
- `role`: the user's role reference.

### Session data

After a successful login, the application stores the following information in the session:

- `id`: the user's database ID.
- `name`: the user's display name.
- `role`: the user's role name.

The `loadSessionUser` middleware makes the authenticated user available through `req.user`.

### User roles

- `customer`: standard user who can access the customer dashboard.
- `admin`: administrator who can access the admin dashboard.

### Booking data

Each booking contains a `passengers` array. Every passenger has an email address.

The customer dashboard must display a booking when at least one passenger's email matches the authenticated user's email.

The user's email must be retrieved securely from the database using the authenticated session ID. It must never be trusted from a value sent by the browser.

## 4. Page Routes and API Endpoints

### Page routes

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/dashboard` | Authenticated customer | Displays the standard user dashboard. |
| GET | `/admin/dashboard` | Admin | Displays the administrator dashboard. |
| GET | `/login` | Signed-out users | Displays the login page. |
| GET | `/register` | Signed-out users | Displays the registration page. |

The User Admin page route is pending confirmation from the teammate responsible for that feature set.

### API endpoint

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/my-bookings` | Authenticated customer | Returns bookings associated with the authenticated user's email. |

### API request

The client-side JavaScript will send a GET request to `/api/my-bookings`.

The request will use the existing authenticated session. The browser must not send a user email to determine which bookings are returned.

### Successful response

HTTP status: `200 OK`

Expected response structure:

```json
{
  "bookings": []
}
```

The `bookings` array will contain only bookings where at least one passenger matches the authenticated user's email.

### Error responses

- `401 Unauthorized`: The user is not authenticated.
- `403 Forbidden`: The authenticated user does not have the customer role.
- `500 Internal Server Error`: An unexpected server error occurs while retrieving bookings.

## 5. Authentication and Navigation Behavior

### Signed-out users

- The header must display Login and Register.
- The header must not display Logout or Dashboard.
- Accessing `/dashboard` must redirect the user to `/login`.
- Accessing `/api/my-bookings` must return HTTP `401`.

### Signed-in customers

- The header must display Logout and Dashboard.
- The header must not display Login or Register.
- The Dashboard link must point to `/dashboard`.
- The customer must only see bookings associated with their own email address.

### Signed-in administrators

- The header must display Logout and Dashboard.
- The header must not display Login or Register.
- The Dashboard link must point to `/admin/dashboard`.
- Administrators must not access the standard customer dashboard as a customer.

### Login redirects

- After a successful administrator login, redirect to `/admin/dashboard`.
- After a successful standard user login, redirect to `/dashboard`.

### Logout behavior

- Logging out must destroy the current session.
- After logout, the user must be redirected to the home page.
- Protected pages and API endpoints must no longer be accessible using the destroyed session.

## 6. Testing Plan

The following tests will be performed locally before submitting the pull request.

### 6.1 Signed-out user tests

- Open `/dashboard` without logging in.
- Verify that the application redirects to `/login`.
- Verify that the header displays Login and Register.
- Verify that Logout and Dashboard are not displayed.
- Send a GET request to `/api/my-bookings`.
- Verify that the API returns HTTP `401 Unauthorized`.

### 6.2 Signed-in customer tests

- Log in using a standard customer account.
- Verify that the application redirects to `/dashboard`.
- Verify that the dashboard displays the correct user's name.
- Verify that the header displays Logout and Dashboard.
- Verify that Login and Register are not displayed.
- Verify that the dashboard loads bookings through a client-side JavaScript API request.
- Verify that only bookings containing at least one passenger with the customer's email are displayed.
- Verify that bookings belonging to other users are not displayed.
- Verify that the Booking Admin and User Admin links are displayed.

### 6.3 Administrator tests

- Log in using an administrator account.
- Verify that the application redirects to `/admin/dashboard`.
- Verify that the Dashboard navigation link points to `/admin/dashboard`.
- Verify that the administrator cannot access the customer dashboard as a customer.
- Verify that an administrator requesting `/api/my-bookings` receives HTTP `403 Forbidden`.

### 6.4 Logout tests

- Log in using a valid account.
- Log out.
- Verify that the application redirects to the home page.
- Try accessing `/dashboard` again.
- Verify that the application redirects to `/login`.
- Verify that `/api/my-bookings` returns HTTP `401 Unauthorized`.

### 6.5 Code quality tests

- Run ESLint and fix any errors or warnings related to the implemented feature.
- Verify that existing application functionality continues working.
- Review the browser console and server terminal for errors.

## 7. Implementation Notes

- Follow the existing project structure and coding conventions.
- Reuse the existing authentication middleware.
- Use `req.user` to identify the authenticated user.
- Retrieve the user's email from the database using the session user ID.
- Do not trust user identifiers or email addresses sent by the browser.
- Keep customer booking retrieval separate from the existing administrative bookings endpoint.
- Use client-side JavaScript and `fetch()` to load bookings dynamically.
- Do not modify unrelated features or other teammates' work.

## 8. Final Decisions

- The User Admin page will be accessed through `/users-admin`.
- The customer dashboard will include a link to `/users-admin`.
- The route was confirmed with the teammate responsible for the User Admin feature.