const fs = require('fs');

async function seed() {
  const partners = [
    { name: 'Skyscanner', category: 'Flight', searchUrlTemplate: 'https://www.skyscanner.com/transport/flights-from/sgn/to/{destination}', clicks: 120, isActive: true },
    { name: 'Traveloka', category: 'Flight', searchUrlTemplate: 'https://www.traveloka.com/en-vn/flight/search?ap={destination}', clicks: 45, isActive: true },
    { name: 'Booking.com', category: 'Hotel', searchUrlTemplate: 'https://www.booking.com/searchresults.html?ss={destination}', clicks: 350, isActive: true },
    { name: 'Agoda', category: 'Hotel', searchUrlTemplate: 'https://www.agoda.com/search?textToSearch={destination}', clicks: 210, isActive: true }
  ];

  for (const p of partners) {
    await fetch('http://localhost:5299/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <YOUR_TOKEN_HERE>' }, // Oh wait, I don't have the token.
      body: JSON.stringify(p)
    });
  }
}
// Seed via EF core? Or I can just write a SQL script and run it using dotnet ef?
// Actually I have direct access to the SQL Server localdb. Or I can use sqlcmd.
