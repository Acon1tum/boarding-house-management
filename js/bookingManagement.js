import { supabase } from "../db/supabase.js";
import { getUserDetails } from "../js/auth.js";

// Fetch All Bookings
async function fetchAllBookings() {
    const user = getUserDetails();
    
    // Log the user info if you want (optional)
    console.log("Fetching all bookings for user:", user);  // This is just for debugging if needed

    // Fetch all bookings from the "bookings" table, including the room number from the "rooms" table
    const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, start_date, end_date, status, rooms(room_number)")  // Select room_number from related rooms table

    // Log the fetched bookings data to check
    console.log("Fetched bookings data:", bookings);

    // Handle potential error in fetching data
    if (error) {
        console.error("Error fetching bookings:", error);
        document.getElementById("bookingListTable").innerHTML = `<tr><td colspan="4" class="p-3 text-red-500 text-center">Error loading bookings.</td></tr>`;
        return;
    }

    // Handle the case when there are no bookings or data is empty
    if (!bookings || bookings.length === 0) {
        document.getElementById("bookingListTable").innerHTML = `<tr><td colspan="4" class="p-3 text-gray-500 text-center">No bookings found.</td></tr>`;
        return;
    }

    // Render bookings into the table
    const bookingListTable = document.getElementById("bookingListTable");

    bookingListTable.innerHTML = bookings
        .map((booking) => {
            // Safely access room_number, fallback to "N/A" if not available
            const roomNumber = booking.rooms ? booking.rooms.room_number : "N/A";
            
            // Return HTML table rows for each booking
            return `
                <tr class="border-b">
                    <td class="p-3">${roomNumber}</td>
                    <td class="p-3">${new Date(booking.start_date).toLocaleDateString()}</td>
                    <td class="p-3">${booking.end_date ? new Date(booking.end_date).toLocaleDateString() : "N/A"}</td>
                    <td class="p-3 text-green-500 font-semibold">${booking.status}</td>
                </tr>
            `;
        })
        .join("");  // Join all rows together into one string for innerHTML
}

// Initialize the booking management page when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", fetchAllBookings);
