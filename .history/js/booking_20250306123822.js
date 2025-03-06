// js/booking.js
import { supabase } from "../db/supabase.js";

// Fetch Available Rooms
async function fetchRooms() {
    const { data, error } = await supabase.from("rooms").select("*").eq("status", "available");
    if (data) {
        const roomList = document.getElementById("roomList");
        roomList.innerHTML = "";
        data.forEach(room => {
            roomList.innerHTML += `
                <div class="room">
                    <p>Room ${room.room_number} - $${room.price}/month</p>
                    <button onclick="bookRoom('${room.id}')">Book Now</button>
                </div>
            `;
        });
    }
}

// Book a Room
async function bookRoom(roomId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Please log in to book a room.");

    const { data, error } = await supabase
        .from("bookings")
        .insert([{ tenant_id: user.id, room_id: roomId, start_date: new Date(), status: "pending" }]);

    if (error) {
        alert("Booking failed: " + error.message);
    } else {
        alert("Booking request sent!");
        fetchRooms();
    }
}

// Event Listener
document.addEventListener("DOMContentLoaded", fetchRooms);
