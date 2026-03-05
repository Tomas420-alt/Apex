# ApexTune - Personalized Motorcycle Maintenance App

## 1. What This App Does
ApexTune is a mobile app that creates a personalized maintenance schedule for any motorcycle. You enter your bike's make/model/year, mileage, and last services, and the app's AI builds a timeline and reminders so you never miss needed care.

## 2. Core Features

### Maintenance Plan
A custom AI engine researches your exact model and current condition to generate a prioritized, mileage- and time-based maintenance timeline, auto-creating tasks and calendar entries (custom implementation).

### Reminder Manager
Sends push/SMS/email alerts, supports snooze and mark-complete, and auto-reschedules or escalates to booking if missed—closing the loop from alert to completion (custom implementation).

### Parts Shopping
Generates exact parts and consumables for upcoming tasks, compares suppliers, builds carts or places orders, and tracks deliveries so you have everything on time (custom implementation).

## 3. Tech Stack
- **Framework**: Expo (iOS & Android)
- **Database**: Convex
- **Auth**: Clerk
- **Feature-specific providers**: Custom AI maintenance planner; Custom reminder/scheduling engine; Custom parts sourcing and ordering module

## 4. UI Design Style
Modern, clean, intuitive UI without being flashy.
