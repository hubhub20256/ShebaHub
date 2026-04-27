# 🏥 ShebaHub

**ShebaHub** is a web platform designed to connect **Researchers**, **Mentors**, and **Apprentices** within the Sheba ecosystem. It serves as a central hub for managing academic research, mentorship opportunities, and professional development.

---

## 🚀 Features

- **Responsive Navigation**: A fully adaptive Navbar that provides a seamless experience on both Desktop and Mobile devices.
  - **Desktop**: Clean 3-part layout (Logo | Navigation | User Actions).
  - **Mobile**: Smooth "Push-down" Hamburger menu.
- **User Authentication**: Built-in support for Login, Registration, and User Profiles (`/login`, `/register`, `/user/:id`).
- **Research & Mentorship Management**: Dedicated sections for browsing Researches, Apprentices, and Mentors.
- **Modern UI/UX**: Clean, professional design with consistent styling and accessible components.

---

## 🛠️ Technology Stack

- **Frontend Framework**: [React](https://react.dev/) (v18+)
- **Build Tool**: [Vite](https://vitejs.dev/) - For lightning-fast development and building.
- **Styling**: pure CSS with clear architecture (`src/styles/` + `src/index.css`).
- **Routing**: [React Router](https://reactrouter.com/) for single-page navigation.

---

## 📂 Project Structure

```bash
ShebaHub/
├── src/
│   ├── assets/         # Images and static assets (Logos, Icons)
│   ├── components/     # Reusable React components (Navbar, Forms, Cards)
│   ├── context/        # Global state management (AuthContext)
│   ├── pages/          # Full page views (Home, Login, Researches)
│   ├── styles/         # Global and Component-specific CSS files
│   ├── App.jsx         # Main Application Entry Point
│   └── main.jsx        # React DOM Root
├── public/             # Public static files
└── index.html          # HTML entry point
```

---

## 🏁 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm (Node Package Manager)

### Installation

1. **Clone the repository** (if applicable) or download the source code.

   ```bash
   git clone https://github.com/your-username/ShebaHub.git
   cd ShebaHub
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start the Development Server**

   ```bash
   npm run dev
   ```

   The app will run at `http://localhost:5173` (or another port if 5173 is busy).

---

## 🤝 Contributing

This project is currently under active development.

- **Navbar**: Recently updated to be fully responsive with educational code comments.
- **Auth**: Functional login/register flows.

Feel free to open issues or suggest improvements!

---

_Verified & Documented by the Dev Team._

---

## 📜 Third-Party Licenses

This project includes third-party open source software. See [LICENSES.md](./LICENSES.md).
