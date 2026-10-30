# Frontend Documentation

The frontend is a React 19/Vite application. It calls the API Gateway and
contains customer, authentication, payment, recovery, support, and admin
experiences.

## Routes

| Path | Function |
|---|---|
| `/` | Home and product navigation |
| `/flight-search` | Flight search and results |
| `/assistant` | Customer AI help |
| `/login`, `/signup` | Authentication |
| `/booking/:flightId` | Passenger details, hold, payment, confirmation |
| `/my-bookings`, `/my-bookings/:id` | Booking list and cancellation |
| `/recovery` | Customer recovery alternatives and approval |
| `/profile` | Account profile |
| `/admin` | Admin catalogue, bookings, simulator, and recovery operations |

## User flows

- Flight selection survives authentication redirects.
- Booking forms send a stable idempotency key and passenger details.
- Payment uses a server-created Razorpay order; no client secret is stored.
- Booking details show cancellation/refund state and print-friendly tickets.
- Recovery cards show original/replacement flights, route and arrival changes,
  fare difference, passenger count, disruption reason, deadline, references,
  compensation status, alternatives, progress, retries, and audit events.
- Admin recovery operations provide KPI cards, filters, retries, manual
  assignment, audit timelines, and reason-required overrides.
- The assistant is customer-only and cannot change bookings.

## API configuration

Development Vite proxies `/api`, `/flightsService`, and `/bookingService` to
`http://localhost:5000`. Set:

```env
VITE_API_PROXY_TARGET=http://localhost:5000
VITE_API_BASE_URL=
```

For a deployed frontend, set `VITE_API_BASE_URL` to the Gateway origin.

## Commands

```powershell
npm install
npm run dev
npm run lint
npm run build
```

## UI conventions

Customer recovery and admin pages use responsive cards, clear status states,
loading/error feedback, restrained transitions, and the existing SkyLink
colour system. Reduced-motion preferences are respected by the page styles.
