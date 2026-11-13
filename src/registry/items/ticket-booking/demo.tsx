"use client";

import { TicketBooking } from "@/components/miyuki-ui/ticket-booking";

export default function TicketBookingDemo() {
  return <TicketBooking defaultRoute={["otaru", "sapporo"]} defaultPassengers={2} />;
}
