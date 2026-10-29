# SkyLink Frontend

React 19/Vite client. The API gateway is the frontend's backend entry point. In development, Vite proxies `/api`, `/flightsService`, and `/bookingService` to `http://localhost:5000`; set `VITE_API_PROXY_TARGET` to change that target. Set `VITE_API_BASE_URL` when a deployed frontend calls a gateway at a separate origin.

## Routes

| Path | Purpose |
|---|---|
| `/` | Flight search and results |
| `/login`, `/signup` | Customer/admin sign-in and customer registration |
| `/booking/:flightId` | Passenger details, seat hold, demo payment, confirmation |
| `/my-bookings`, `/my-bookings/:id` | Customer booking list and detail/cancellation |
| `/profile` | Signed-in account profile |
| `/admin` | Admin catalogue management and booking review |

Signed-out flight selection is kept through login/signup, then restored at the booking page. Booking uses the demo payment API; it does not collect card data or charge money. Customers can cancel eligible bookings before departure; the current cancellation flow has no refund integration.

## Run and verify

```sh
npm install
npm run dev
npm run lint
npm run build
```

Login, booking, and admin operations require the API Gateway and relevant backend services. Password recovery screens are not routed because matching backend APIs are not implemented.
