# ⏱️ TimeTrack
### Your Personal Work-Life Balance Companion

TimeTrack is a distraction-free tool designed to help you manage your office hours effortlessly. Built for the modern professional, it tracks your work sessions, manages your breaks, and even calculates when you can head home—all from a sleek, mobile-friendly interface.

---

## ✨ Features

- **Reliable Persistence**: Powered by PostgreSQL for robust data management and multi-user support.
- **Secure Access**: Built-in authentication ensures your session data is yours alone.
- **Stay Focused**: A clear, live display of your current work session helps you stay mindful of your time.
- **Healthy Breaks**: Log your breaks with a single tap to ensure you're taking the rest you deserve.
- **Smart Exit Estimates**: No more manual math. Based on your company's work hours and your actual breaks, TimeTrack tells you exactly when you've hit your 8-hour goal.

---

## 🚀 Key Highlights

- **🎯 One-Tap Punching**: Start and end your workday with a single click. No complex forms or nested menus.
- **☕ Flexible Breaks**: Take as many breaks as you need. The timer pauses your "Work Time" automatically so your stats stay honest.
- **📊 Virtual Dashboard**: Get a high-level summary of your day at a glance—total worked, total breaks, and your net time in the office.
- **🕒 Smart Exit Clock**: Automatically calculates your estimated departure time, adjusting dynamically if you take longer breaks than allowed.
- **📝 Session Notes**: Keep track of what you achieved with quick, easy-to-add session descriptions.
- **📱 Phone Ready**: The entire app is optimized for your mobile browser, making it the perfect desktop companion for your phone.

---

## 🛠️ Usage Guide

### Starting Your Day
Simply sign in and click **"Punch In"** when you start work. You can add a quick note about your focus for the day.

### Taking a Break
Feeling like a coffee? Hit **"Take a Break"**. The status card will turn amber, and your current break timer will start ticking. Click **"End Break"** to resume your work session.

### Wrapping Up
Once you're done, click **"Punch Out"**. Your session is saved to your history, and your daily summary is updated.

### Editing Past Sessions
Need to fix a mistake? Use the **History** tab to edit or delete any past session, including adjusting break times and notes.

---

## ⚙️ Setup & Customization

### Quick Start
1. **Clone the repository** and install dependencies: `npm install`
2. **Configure your environment**: Set up your `.env` file with your `DATABASE_URL` (PostgreSQL connection string).
3. **Launch the app**: `npm run dev`
4. **Visit**: `http://localhost:3000`

### Personalize Your Hours
Click the **Gear icon** in the header to set your standard office hours (e.g., 9:00 AM to 6:00 PM) and your allowed break duration. These settings drive the "Estimated Exit" calculation.

---

## 🧑‍💻 Technical Details (For Developers)

TimeTrack is built with a modern, high-performance stack:
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (via `pg` pool)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS with a custom Dark/Glassmorphism theme
- **Components**: Radix UI primitives for accessible dialogues and toasts
- **Icons**: Lucide React


