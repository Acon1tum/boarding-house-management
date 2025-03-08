// js/admin.js
import { supabase } from "../db/supabase.js";

// Fetch Pending Bookings
async function fetchBookings() {
    const { data, error } = await supabase.from("bookings").select("*, rooms(room_number), users(name)");
    if (data) {
        const bookingList = document.getElementById("bookingList");
        bookingList.innerHTML = "";
        data.forEach(booking => {
            bookingList.innerHTML += `
                <div class="p-4 border rounded-lg">
                    <p><strong>${booking.users.name}</strong> requested Room ${booking.rooms.room_number}</p>
                    <p>Status: <span class="font-bold">${booking.status}</span></p>
                    <button class="bg-green-500 text-white px-3 py-1 rounded" onclick="updateBooking('${booking.id}', 'approved')">Approve</button>
                    <button class="bg-red-500 text-white px-3 py-1 rounded" onclick="updateBooking('${booking.id}', 'rejected')">Reject</button>
                </div>
            `;
        });
    }
}

// Update Booking Status
async function updateBooking(bookingId, status) {
    await supabase.from("bookings").update({ status }).eq("id", bookingId);
    alert(`Booking ${status}`);
    fetchBookings();
}

// Fetch All Rooms
async function fetchRooms() {
    const { data, error } = await supabase.from("rooms").select("*");
    if (data) {
        const roomList = document.getElementById("roomList");
        roomList.innerHTML = "";
        data.forEach(room => {
            roomList.innerHTML += `
                <div class="p-4 border rounded-lg">
                    <p>Room ${room.room_number} - ₱${room.price}/month</p>
                    <p>Status: ${room.status}</p>
                    <button class="bg-blue-500 text-white px-3 py-1 rounded" onclick="toggleRoomStatus('${room.id}', '${room.status}')">Toggle Status</button>
                </div>
            `;
        });
    }
}

// Toggle Room Status
async function toggleRoomStatus(roomId, currentStatus) {
    const newStatus = currentStatus === "available" ? "occupied" : "available";
    await supabase.from("rooms").update({ status: newStatus }).eq("id", roomId);
    fetchRooms();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    fetchBookings();
    fetchRooms();
});
