import { supabase } from "../db/supabase.js";

// Fetch Tenant's Booking Status
async function fetchBookingStatus() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "tenant") {
        window.location.href = "login.html";
        return;
    }

    const { data: booking, error } = await supabase
        .from("bookings")
        .select("*, rooms(room_number, status, price)")
        .eq("tenant_id", user.id)
        .maybeSingle();

    const roomStatusDiv = document.getElementById("roomStatus");

    if (!booking) {
        roomStatusDiv.innerHTML = `
            <p class="text-lg">You have not booked a room yet.</p>
            <a href="booking.html" class="bg-blue-500 text-white px-4 py-2 rounded mt-2 inline-block">Book Now</a>
        `;
        return;
    }

    roomStatusDiv.innerHTML = `
        <h3 class="text-xl font-semibold">Your Booking</h3>
        <p class="text-lg">Room: ${booking.rooms.room_number}</p>
        <p>Status: ${booking.status}</p>
        <p>Price: $${booking.rooms.price} / month</p>
    `;
}

// Fetch Tenant's Billing Notifications
async function fetchBillingNotifications() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const { data: bills, error } = await supabase
        .from("bills")
        .select("*")
        .eq("tenant_id", user.id)
        .eq("status", "pending");

    const billingDiv = document.getElementById("billingNotifications");

    if (!bills || bills.length === 0) {
        billingDiv.innerHTML = `<p>No pending bills.</p>`;
        return;
    }

    billingDiv.innerHTML = bills.map(bill => `
        <p>Amount: $${bill.amount} - Due: ${new Date(bill.due_date).toDateString()}</p>
        <p>Status: ${bill.status}</p>
    `).join("<hr>");
}

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
    fetchBookingStatus();
    fetchBillingNotifications();
});
