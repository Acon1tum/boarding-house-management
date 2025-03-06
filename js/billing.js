import { supabase } from "../db/supabase.js";

// Fetch Bills
async function fetchBills() {
    // Get the logged-in user
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        console.error("No user found.");
        return;
    }

    // Query the bills table for the logged-in user (tenant_id)
    const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("tenant_id", user.id)  // Use the tenant's user id
        .order("due_date", { ascending: true });

    if (error) {
        console.error("Error fetching bills:", error.message);
        return;
    }

    const billList = document.getElementById("billListTable");
    billList.innerHTML = "";

    // Check if there are no bills
    if (data.length === 0) {
        billList.innerHTML = `
            <tr>
                <td class="p-3 text-gray-600" colspan="3">No bills found.</td>
            </tr>
        `;
        return;
    }

    // Populate the bill list with the user's bills
    data.forEach(bill => {
        // Determine the color based on bill status
        let statusClass = '';
        switch (bill.status) {
            case 'pending':
                statusClass = 'bg-yellow-200 text-yellow-800';  // Yellow for pending
                break;
            case 'paid':
                statusClass = 'bg-green-200 text-green-800';   // Green for paid
                break;
            case 'overdue':
                statusClass = 'bg-red-200 text-red-800';       // Red for overdue
                break;
            default:
                statusClass = 'bg-gray-200 text-gray-800';     // Default color if status is unknown
        }

        billList.innerHTML += `
            <tr>
                <td class="p-3 text-gray-600">$${bill.amount}</td>
                <td class="p-3 text-gray-600">${new Date(bill.due_date).toDateString()}</td>
                <td class="p-3 ${statusClass}">${bill.status}</td>
            </tr>
        `;
    });
}

// Send Notifications (Simulated)
function sendNotification(message) {
    alert(message);
}

// Notify Due Bills
async function checkDueBills() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("tenant_id", user.id)
        .eq("status", "pending");

    if (data && data.length > 0) {
        sendNotification("You have pending bills due soon!");
    }
}

// Event Listener
document.addEventListener("DOMContentLoaded", () => {
    fetchBills();  // Fetch bills when the page loads
    setInterval(checkDueBills, 60000);  // Check for due bills every minute
});
