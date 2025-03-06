// js/booking.js
import { supabase } from "../db/supabase.js";

// Fetch Available Rooms with Filters
async function fetchRooms() {
    const minPrice = document.getElementById("minPrice")?.value || 0;
    const maxPrice = document.getElementById("maxPrice")?.value || 9999;
    const status = document.getElementById("statusFilter")?.value || "available";

    let query = supabase
        .from("rooms")
        .select("*")
        .gte("price", minPrice)
        .lte("price", maxPrice)
        .eq("status", status);

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    const roomList = document.getElementById("roomList");
    roomList.innerHTML = "";

    data.forEach(room => {
        roomList.innerHTML += `
            <div class="p-4 border rounded-lg bg-white shadow-lg">
                <p class="text-lg font-bold">Room ${room.room_number}</p>
                <p class="text-gray-600">$${room.price}/month</p>
                <button class="bg-green-500 text-white px-4 py-2 mt-2 rounded" onclick="bookRoom('${room.id}')">Book Now</button>
            </div>
        `;
    });
}

// Book a Room
async function bookRoom(roomId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Please log in to book a room.");

    // Check if user has already booked a room
    const { data: existingBooking } = await supabase
        .from("bookings")
        .select("*")
        .eq("tenant_id", user.id)
        .eq("status", "pending");

    if (existingBooking?.length > 0) {
        return alert("You already have a pending booking.");
    }

    // Insert new booking
    const { error } = await supabase
        .from("bookings")
        .insert([{ tenant_id: user.id, room_id: roomId, start_date: new Date(), status: "pending" }]);

    if (error) {
        alert("Booking failed: " + error.message);
    } else {
        alert("Booking request sent!");
        fetchRooms();
    }
}

// Apply filters on form submit
document.getElementById("filterForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    fetchRooms();
});

// Initialize
document.addEventListener("DOMContentLoaded", fetchRooms);
