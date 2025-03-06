import { supabase } from "../db/supabase.js";

// Fetch Booking Requests
async function fetchBookings() {
    const { data, error } = await supabase
        .from("bookings")
        .select("id, status, start_date, tenant_id, room_id, users:users(first_name, last_name), rooms:rooms(room_number)")
        .eq("status", "pending");

    if (error) {
        console.error("Error fetching bookings:", error);
        return;
    }

    const bookingList = document.getElementById("bookingList");
    if (data.length === 0) {
        bookingList.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">No pending booking requests.</td></tr>`;
        return;
    }

    bookingList.innerHTML = data.map(booking => `
        <tr class="border-b">
            <td class="p-3">${booking.users.first_name} ${booking.users.last_name}</td>
            <td class="p-3">Room ${booking.rooms.room_number}</td>
            <td class="p-3">${new Date(booking.start_date).toDateString()}</td>
            <td class="p-3 text-yellow-500 font-semibold">${booking.status}</td>
            <td class="p-3">
                <button class="bg-green-500 text-white px-3 py-1 rounded approve-btn" 
                    data-id="${booking.id}" data-room="${booking.room_id}">
                    ✅ Approve
                </button>
                <button class="bg-red-500 text-white px-3 py-1 rounded reject-btn"
                    data-id="${booking.id}">
                    ❌ Reject
                </button>
            </td>
        </tr>
    `).join("");

    // Attach event listeners
    document.querySelectorAll(".approve-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const bookingId = e.target.getAttribute("data-id");
            const roomId = e.target.getAttribute("data-room");
            confirmAction(() => approveBooking(bookingId, roomId), "approve this booking?");
        });
    });

    document.querySelectorAll(".reject-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const bookingId = e.target.getAttribute("data-id");
            confirmAction(() => rejectBooking(bookingId), "reject this booking?");
        });
    });
}

// Confirm Action Before Executing
function confirmAction(action, message) {
    document.getElementById("confirmMessage").textContent = `Are you sure you want to ${message}`;
    document.getElementById("confirmModal").classList.remove("hidden");

    document.getElementById("confirmYes").onclick = () => {
        action();
        closeModal();
    };
}

// Close Modal
function closeModal() {
    document.getElementById("confirmModal").classList.add("hidden");
}

// Approve Booking & Mark Room as Occupied
async function approveBooking(id, roomId) {
    const { error } = await supabase.from("bookings").update({ status: "approved" }).eq("id", id);
    if (!error) {
        await supabase.from("rooms").update({ status: "occupied" }).eq("id", roomId);
        fetchBookings();
    } else {
        alert("Failed to approve booking: " + error.message);
    }
}

// Reject Booking
async function rejectBooking(id) {
    const { error } = await supabase.from("bookings").update({ status: "rejected" }).eq("id", id);
    if (!error) {
        fetchBookings();
    } else {
        alert("Failed to reject booking: " + error.message);
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", fetchBookings);
