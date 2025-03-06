import { supabase } from "../db/supabase.js";
import { getUserDetails } from "../js/auth.js";

// Fetch All Bookings
async function fetchAllBookings() {
    const user = getUserDetails();

    // Check if user is a landlord, otherwise redirect to dashboard
    if (user.role !== "landlord") {
        window.location.href = "dashboard.html"; // Redirect if not landlord
        return;
    }
    
    // Log the user info if you want (optional)
    console.log("Fetching all bookings for user:", user);  // This is just for debugging if needed

    // Fetch all bookings from the "bookings" table, including the room number and tenant name
    const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
            id, 
            start_date, 
            end_date, 
            status, 
            rooms(room_number),
            tenant_id,
            users(first_name, last_name)
        `);  // Select tenant name from related users table

    // Log the fetched bookings data to check
    console.log("Fetched bookings data:", bookings);

    // Handle potential error in fetching data
    if (error) {
        console.error("Error fetching bookings:", error);
        document.getElementById("bookingListTable").innerHTML = `<tr><td colspan="5" class="p-3 text-red-500 text-center">Error loading bookings.</td></tr>`;
        return;
    }

    // Handle the case when there are no bookings or data is empty
    if (!bookings || bookings.length === 0) {
        document.getElementById("bookingListTable").innerHTML = `<tr><td colspan="5" class="p-3 text-gray-500 text-center">No bookings found.</td></tr>`;
        return;
    }

    // Render bookings into the table
    const bookingListTable = document.getElementById("bookingListTable");

    bookingListTable.innerHTML = bookings
        .map((booking) => {
            // Safely access room_number, fallback to "N/A" if not available
            const roomNumber = booking.rooms ? booking.rooms.room_number : "N/A";
            
            // Get tenant name from the users object
            const tenantFirstName = booking.users ? booking.users.first_name : "Unknown";
            const tenantLastName = booking.users ? booking.users.last_name : "Tenant";
            const tenantFullName = `${tenantFirstName} ${tenantLastName}`;
            
            // Dynamically set status color based on the booking status
            let statusColorClass = "text-yellow-500";  // Default color for pending status

            if (booking.status === "approved") {
                statusColorClass = "text-green-500 font-semibold";  // Green for approved
            } else if (booking.status === "rejected") {
                statusColorClass = "text-red-500 font-semibold";  // Red for rejected
            }

            // Return HTML table rows for each booking
            return `
                <tr class="border-b">
                    <td class="p-3">${roomNumber}</td>
                    <td class="p-3">${tenantFullName}</td>
                    <td class="p-3">${new Date(booking.start_date).toLocaleDateString()}</td>
                    <td class="p-3">${booking.end_date ? new Date(booking.end_date).toLocaleDateString() : "N/A"}</td>
                    <td class="p-3 ${statusColorClass}">${booking.status}</td>  <!-- Dynamically applied status color -->
                </tr>
            `;
        })
        .join("");  // Join all rows together into one string for innerHTML
}

// Initialize the booking management page when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", fetchAllBookings);
