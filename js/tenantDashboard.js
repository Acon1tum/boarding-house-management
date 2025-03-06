import { supabase } from "../db/supabase.js";
import { getUserDetails, checkAuth } from "../js/auth.js";

// Fetch Tenant's Booking Status
async function fetchBookingStatus() {
    const user = getUserDetails();
    if (!user || user.role !== "tenant") {
        console.warn("Unauthorized access. Redirecting...");
        window.location.href = "login.html";
        return;
    }

    console.log("Fetching approved booking status for:", user);

    const { data: booking, error } = await supabase
        .from("bookings")
        .select("id, start_date, end_date, rooms(room_number, status, price)")
        .eq("tenant_id", user.id)
        .eq("status", "approved") // Fetch only approved bookings
        .maybeSingle();

    const roomStatusDiv = document.getElementById("roomStatus");

    if (error) {
        console.error("Error fetching booking status:", error);
        roomStatusDiv.innerHTML = `<p class="text-red-500">Error loading booking status.</p>`;
        return;
    }

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
        <p>Status: <span class="text-green-500 font-medium">Approved</span></p>
        <p>Price: $${booking.rooms.price} / month</p>
        <p>Start Date: ${new Date(booking.start_date).toLocaleDateString()}</p>
        ${booking.end_date ? `<p>End Date: ${new Date(booking.end_date).toLocaleDateString()}</p>` : ""}
    `;
}

// Fetch Tenant's Billing Notifications
async function fetchBillingNotifications() {
    const user = getUserDetails();
    if (!user) {
        console.warn("No user details found. Skipping billing fetch.");
        return;
    }

    console.log("Fetching billing details for:", user);

    const { data: bills, error } = await supabase
        .from("bills")
        .select("*")
        .eq("tenant_id", user.id)
        .eq("status", "pending");

    const billingDiv = document.getElementById("billingNotifications");

    if (error) {
        console.error("Error fetching billing details:", error);
        billingDiv.innerHTML = `<p class="text-red-500">Error loading billing information.</p>`;
        return;
    }

    if (!bills || bills.length === 0) {
        billingDiv.innerHTML = `<p>No pending bills.</p>`;
        return;
    }

    billingDiv.innerHTML = bills.map(bill => `
        <div class="border-b py-2">
            <p>Amount: <strong>$${bill.amount}</strong></p>
            <p>Due Date: ${new Date(bill.due_date).toDateString()}</p>
            <p>Status: <span class="text-red-500 font-semibold">${bill.status}</span></p>
        </div>
    `).join("");
}

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing Tenant Dashboard...");
    checkAuth(); // Ensure the user is authenticated
    fetchBookingStatus();
    fetchBillingNotifications();
});
