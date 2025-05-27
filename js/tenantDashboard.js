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

    const { data: tenancies, error } = await supabase
        .from("room_tenants")
        .select("id, start_date, end_date, rooms(room_number, status, price, image_url, image_base64)")
        .eq("tenant_id", user.id)
        .is("end_date", null);

    const roomStatusDiv = document.getElementById("roomStatus");

    if (error) {
        console.error("Error fetching booking status:", error);
        roomStatusDiv.innerHTML = `<p class="text-red-500">Error loading booking status.</p>`;
        return;
    }

    if (!tenancies || tenancies.length === 0) {
        roomStatusDiv.innerHTML = `
            <p class="text-lg">You have not booked a room yet.</p>
            <a href="booking.html" class="bg-blue-500 text-white px-4 py-2 rounded mt-2 inline-block">Book Now</a>
        `;
        return;
    }

    let html = `<h3 class="text-xl font-semibold">Your Bookings</h3>`;
    tenancies.forEach(tenancy => {
        html += `
            <div class="border-b py-4 flex flex-row-reverse items-center gap-4">
                ${tenancy.rooms.image_url || tenancy.rooms.image_base64 ? `<img src="${tenancy.rooms.image_url || tenancy.rooms.image_base64}" alt="Room Image" class="w-24 h-24 object-cover rounded border" />` : ''}
                <div class="flex-1">
                    <p class="text-lg">Room: ${tenancy.rooms.room_number}</p>
                    <p>Price: ${tenancy.rooms.price.toFixed(2)} PHP / month</p>
                    <p>Start Date: ${new Date(tenancy.start_date).toLocaleDateString()}</p>
                    ${tenancy.end_date ? `<p>End Date: ${new Date(tenancy.end_date).toLocaleDateString()}</p>` : ""}
                </div>
            </div>
        `;
    });
    roomStatusDiv.innerHTML = html;
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
            <p>Amount: <strong>₱${bill.amount}</strong></p>
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
