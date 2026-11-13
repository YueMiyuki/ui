"use client";

import { CalendarDate } from "@internationalized/date";
import { useState } from "react";
import { type CalendarEvent, type CalendarSource, EventCalendar } from "@/components/miyuki-ui/calendar";

const calendars: CalendarSource[] = [
  { id: "tours", label: "Tours", color: "var(--chart-1)" },
  { id: "maintenance", label: "Maintenance", color: "var(--chart-4)" },
  { id: "holidays", label: "Holidays", color: "var(--chart-5)" },
];

const schedule: CalendarEvent[] = [
  {
    id: "battery",
    title: "Battery swap, Asahidake",
    start: "2027-02-02T10:00",
    end: "2027-02-02T13:00",
    calendar: "maintenance",
    location: "Asahidake ropeway, upper station",
  },
  { id: "setsubun", title: "Setsubun", start: "2027-02-03", calendar: "holidays" },
  {
    id: "light-path",
    title: "Snow light path walks",
    start: "2027-02-05",
    end: "2027-02-09",
    calendar: "tours",
    location: "Otaru canal",
    notes: "Evening walks between the lanterns, 17:00 to 21:00. Groups of twelve.",
  },
  {
    id: "radar",
    title: "Radar calibration",
    start: "2027-02-09T14:00",
    end: "2027-02-09T17:30",
    calendar: "maintenance",
    location: "Aomori coastal radar",
  },
  { id: "foundation", title: "National Foundation Day", start: "2027-02-11", calendar: "holidays" },
  {
    id: "backcountry",
    title: "Hakuba backcountry day",
    start: "2027-02-14T09:00",
    end: "2027-02-14T15:30",
    calendar: "tours",
    location: "Happo-one, Hakuba",
    notes: "Avalanche bulletin at 07:30. Beacons checked at the gondola.",
  },
  {
    id: "de-icing",
    title: "Anemometer de-icing",
    start: "2027-02-14T11:00",
    end: "2027-02-14T12:00",
    calendar: "maintenance",
    location: "Hakuba 47 summit mast",
  },
  {
    id: "onsen",
    title: "Nozawa onsen walk",
    start: "2027-02-14T13:30",
    end: "2027-02-14T16:00",
    calendar: "tours",
    location: "Ōyu bathhouse, Nozawa",
  },
  {
    id: "release",
    title: "Forecast model 4.2 release",
    start: "2027-02-14T16:00",
    end: "2027-02-14T17:00",
    calendar: "maintenance",
  },
  {
    id: "snowshoe",
    title: "Moonlight snowshoe",
    start: "2027-02-14T18:30",
    end: "2027-02-14T20:30",
    calendar: "tours",
    location: "Lake Tōya, west shore",
    notes: "Full moon at 23:05. Lamps provided.",
  },
  {
    id: "traverse",
    title: "Hut-to-hut traverse",
    start: "2027-02-17",
    end: "2027-02-19",
    calendar: "tours",
    location: "Northern Alps, Tsubakuro hut",
  },
  {
    id: "webcam",
    title: "Webcam lens clean",
    start: "2027-02-18T09:30",
    end: "2027-02-18T10:30",
    calendar: "maintenance",
    location: "Niseko Annupuri",
  },
  {
    id: "first-tracks",
    title: "Niseko first tracks",
    start: "2027-02-20T07:30",
    end: "2027-02-20T11:00",
    calendar: "tours",
    location: "Niseko Grand Hirafu",
  },
  { id: "birthday", title: "Emperor's Birthday", start: "2027-02-23", calendar: "holidays" },
  {
    id: "migration",
    title: "Station data migration",
    start: "2027-02-24T22:00",
    end: "2027-02-25T04:00",
    calendar: "maintenance",
    notes: "Readings are buffered on site and backfilled in the morning.",
  },
  {
    id: "kiso",
    title: "Kiso valley rail and ryokan",
    start: "2027-02-27T10:00",
    end: "2027-02-27T18:00",
    calendar: "tours",
    location: "Narai-juku, Kiso",
  },
];

const today = new CalendarDate(2027, 2, 14);

export default function CalendarDemo() {
  const [events, setEvents] = useState(schedule);

  return (
    <EventCalendar
      className="max-w-4xl"
      events={events}
      calendars={calendars}
      today={today}
      onCreate={(date) =>
        setEvents((list) => [
          ...list,
          { id: `new-${list.length}`, title: "New tour", start: `${date.toString()}T12:00`, calendar: "tours" },
        ])
      }
    />
  );
}
