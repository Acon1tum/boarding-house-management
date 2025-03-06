import { supabase } from "../db/supabase.js";

// Fetch Booking Requests
async function fetchBookings() {
    const { data, error } = await supabase
        .from("bookings")
        .select("id, status, start_date, users(first_name, last_name), rooms(room_number)")
        .eq("status", "pending");

    if (error) {
        console.error("Error fetching bookings:", error);
        return;
    }

    const bookingList = document.getElementById("bookingList");
    bookingList.innerHTML = data.map(booking => `
        <tr class="border-b">
            <td class="p-2">${booking.users.first_name} ${booking.users.last_name}</td>
            <td class="p-2">${booking.rooms.room_number}</td>
            <td class="p-2">${new Date(booking.start_date).toDateString()}</td>
            <td class="p-2">${booking.status}</td>
            <td class="p-2">
                <button onclick="approveBooking('${booking.id}')" class="bg-green-500 text-white px-2 py-1 rounded">Approve</button>
                <button onclick="rejectBooking('${booking.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Reject</button>
            </td>
        </tr>
    `).join("");
}

// Approve Booking
async function approveBooking(id) {
    const { error } = await supabase.from("bookings").update({ status: "approved" }).eq("id", id);
    if (error) {
        alert("Failed to approve booking: " + error.message);
    } else {
        fetchBookings();
    }
}

// Reject Booking
async function rejectBooking(id) {
    const { error } = await supabase.from("bookings").update({ status: "rejected" }).eq("id", id);
    if (error) {
        alert("Failed to reject booking: " + error.message);
    } else {
        fetchBookings();
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", fetchBookings);
