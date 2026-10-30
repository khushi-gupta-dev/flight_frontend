# SkyLink Frontend

React 19/Vite client. The API gateway is the frontend's backend entry point. In development, Vite proxies `/api`, `/flightsService`, and `/bookingService` to `http://localhost:5000`; set `VITE_API_PROXY_TARGET` to change that target. Set `VITE_API_BASE_URL` when a deployed frontend calls a gateway at a separate origin.

## Routes

| Path | Purpose |
|---|---|
| `/` | SkyLink home page, navigation, product overview, and flight-search call to action |
| `/flight-search` | Dedicated flight search and results |
| `/assistant` | Customer-only Gemini flight and product assistant |
| `/login`, `/signup` | Customer/admin sign-in and customer registration |
| `/booking/:flightId` | Passenger details, seat hold, Razorpay Checkout, confirmation |
| `/my-bookings`, `/my-bookings/:id` | Customer booking list and detail/cancellation |
| `/profile` | Signed-in account profile |
| `/admin` | Admin catalogue management and booking review |

Signed-out flight selection is kept through login/signup, then restored at the booking page. Booking creation sends a stable idempotency key and retains it for retries of the same passenger submission. Checkout uses a server-created Razorpay order and confirms payment through the Booking Service verification endpoint. The demo payment endpoint has been removed. Customers can request cancellation before departure; the booking shows `cancellation requested` while the 85% refund (15% cancellation charge) is pending and `cancelled` after the refund is accepted. Confirmed booking details have a print-friendly ticket; use the browser print dialog and choose Save as PDF.

The home page provides the primary navigation, product information, and links to the dedicated flight-search page; it does not perform inline flight searches. The customer-only assistant page starts with saved questions, documents the accepted flight-search format, supports contextual follow-up suggestions and an `OK, thanks` close action, and sends queries to `POST /supportService/api/v1/chat` or `/supportService/api/v1/assistant` through the Gateway. The Gateway and Support Service require a non-admin `customer` role. The assistant calls Google's Gemini API with fixed SkyLink guidance and falls back to local verified guidance when Gemini is unavailable; it receives no payment details or private booking data and cannot change account state. Flight search is available at `/flight-search`; it validates airport selections against the Flights Service, supports date, traveller, price, and sort filters, shows only upcoming inventory, and carries the selected flight and traveller count into the existing booking flow. Configure `GEMINI_API_KEY` and optional `GEMINI_MODEL` in Support Service only.

## Run and verify

```sh
npm install
npm run dev
npm run lint
npm run build
```

Login, booking, and admin operations require the API Gateway and relevant backend services. Password recovery screens are not routed because matching backend APIs are not implemented.
