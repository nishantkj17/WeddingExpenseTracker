# 💒 Wedding Expense Tracker

A simple and elegant web application to track wedding expenses with a Node.js backend and JSON file storage.

## Features

- 💰 Set and track your total wedding budget
- 📊 View real-time budget statistics and progress
- ➕ Add, edit, and delete expenses with detailed information
- 🏷️ Categorize expenses (Venue, Catering, Photography, etc.)
- 💵 Track estimated vs actual costs
- ✅ Mark expenses as paid
- 🔍 Filter expenses by category
- 📱 Responsive design for mobile and desktop

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Node.js with Express.js
- **Storage:** JSON file
- **Styling:** Custom CSS with modern design

## Installation

1. **Clone or navigate to the repository:**
   ```bash
   cd c:\repos\WeddingExpenseTracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

1. **Start the server:**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

2. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

3. **Start tracking your wedding expenses!**

## API Endpoints

### Expenses
- `GET /api/expenses` - Get all expenses and budget
- `GET /api/expenses/:id` - Get a single expense
- `POST /api/expenses` - Create a new expense
- `PUT /api/expenses/:id` - Update an expense
- `DELETE /api/expenses/:id` - Delete an expense

### Budget
- `PUT /api/budget` - Update the total budget

### Summary
- `GET /api/summary` - Get budget summary statistics

## Expense Categories

- Venue
- Catering
- Photography
- Videography
- Flowers & Decorations
- Music & Entertainment
- Wedding Dress
- Suit/Tuxedo
- Rings
- Invitations
- Wedding Cake
- Transportation
- Accommodation
- Favors & Gifts
- Other

## Data Storage

All data is stored in `data/expenses.json` with the following structure:

```json
{
  "budget": 50000,
  "expenses": [
    {
      "id": "1234567890",
      "category": "Venue",
      "description": "Downtown Ballroom",
      "estimatedCost": 5000,
      "actualCost": 5200,
      "paid": true,
      "date": "2026-06-15",
      "vendor": "Grand Ballroom Inc",
      "notes": "Includes tables and chairs"
    }
  ]
}
```

## Project Structure

```
WeddingExpenseTracker/
├── data/
│   └── expenses.json          # JSON data storage
├── public/
│   ├── css/
│   │   └── styles.css         # Application styles
│   ├── js/
│   │   └── app.js             # Frontend JavaScript
│   └── index.html             # Main HTML page
├── server.js                  # Express server & API
├── package.json               # Dependencies
└── README.md                  # This file
```

## Customization

- **Port:** Change the `PORT` variable in `server.js` (default: 3000)
- **Colors:** Modify CSS variables in `public/css/styles.css`
- **Categories:** Add/remove options in both `index.html` (form and filter)
- **Currency:** Change the currency format in `app.js` `formatCurrency()` function

## Future Enhancements

- User authentication
- Multiple wedding events
- Export to PDF/Excel
- Payment reminders
- Vendor contact management
- Image uploads for receipts
- Database integration (MongoDB/PostgreSQL)

## License

MIT

## Contributing

Feel free to fork, modify, and submit pull requests!

---

Made with 💕 for planning your perfect day!
