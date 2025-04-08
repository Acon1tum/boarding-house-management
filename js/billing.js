import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

// Ensure that only tenants can access the bills page
document.addEventListener("DOMContentLoaded", () => {
    const user = getUserDetails();
    
    if (!user) {
        console.warn("No user found, redirecting to login.");
        window.location.href = "login.html";  // Redirect if no user is logged in
        return;
    }

    if (user.role !== "tenant") {
        console.warn("Non-tenant user trying to access tenant page, redirecting.");
        switch (user.role) {
            case "admin":
                window.location.href = "admin.html";
                break;
            case "landlord":
                window.location.href = "landlordDashboard.html";
                break;
            default:
                window.location.href = "login.html";
        }
        return;
    }

    console.log("User authenticated as tenant:", user);
    fetchActiveBills();
    fetchBillingHistory();
    setInterval(checkDueBills, 60000);
});

// Fetch Active Bills
async function fetchActiveBills() {
    try {
        const user = getUserDetails();
        if (!user || user.role !== "tenant") {
            window.location.href = "index.html";
            return;
        }

        const { data: bills, error } = await supabase
            .from("bills")
            .select("*")
            .eq("tenant_id", user.id)
            .eq("status", "pending")
            .order("due_date", { ascending: true });

        if (error) {
            console.error("Error fetching active bills:", error);
            alert("Failed to fetch active bills. Please try again.");
            return;
        }

        const billListTable = document.getElementById("billListTable");
        if (!billListTable) {
            console.error("Could not find billListTable element");
            return;
        }

        billListTable.innerHTML = "";

        if (!bills || bills.length === 0) {
            billListTable.innerHTML = `
                <tr>
                    <td colspan="3" class="p-3 text-gray-600 text-center">No active bills</td>
                </tr>
            `;
            return;
        }

        bills.forEach(bill => {
            const dueDate = new Date(bill.due_date);
            const isOverdue = dueDate < new Date() && bill.status === "pending";
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="p-3">${bill.amount.toFixed(2)} PHP</td>
                <td class="p-3">${dueDate.toLocaleDateString()}</td>
                <td class="p-3">
                    <span class="${isOverdue ? 'text-red-500' : 'text-yellow-500'}">
                        ${isOverdue ? 'Overdue' : 'Pending'}
                    </span>
                </td>
            `;
            billListTable.appendChild(row);
        });

        // Check for overdue bills and show notification
        const overdueBills = bills.filter(bill => 
            new Date(bill.due_date) < new Date() && bill.status === "pending"
        );
        
        if (overdueBills.length > 0) {
            showNotification(`You have ${overdueBills.length} overdue bill(s)!`);
        }
    } catch (error) {
        console.error("Unexpected error in fetchActiveBills:", error);
        alert("An unexpected error occurred. Please try again.");
    }
}

// Fetch Billing History
async function fetchBillingHistory() {
    try {
        const user = getUserDetails();
        if (!user || user.role !== "tenant") {
            window.location.href = "index.html";
            return;
        }

        const { data: billingHistory, error } = await supabase
            .from("billing_record")
            .select("*")
            .eq("tenant_id", user.id)
            .order("payment_date", { ascending: false });

        if (error) {
            console.error("Error fetching billing history:", error);
            alert("Failed to fetch billing history. Please try again.");
            return;
        }

        const billHistoryTable = document.getElementById("billHistoryTable");
        if (!billHistoryTable) {
            console.error("Could not find billHistoryTable element");
            return;
        }

        billHistoryTable.innerHTML = "";

        if (!billingHistory || billingHistory.length === 0) {
            billHistoryTable.innerHTML = `
                <tr>
                    <td colspan="3" class="p-3 text-gray-600 text-center">No billing history</td>
                </tr>
            `;
            return;
        }

        // Store billing data for filtering
        window.billingData = billingHistory;

        // Display all billing history initially
        displayBillingHistory(billingHistory);
    } catch (error) {
        console.error("Unexpected error in fetchBillingHistory:", error);
        alert("An unexpected error occurred. Please try again.");
    }
}

// Display Billing History
function displayBillingHistory(bills) {
    const billHistoryTable = document.getElementById("billHistoryTable");
    if (!billHistoryTable) return;

    billHistoryTable.innerHTML = "";

    if (!bills || bills.length === 0) {
        billHistoryTable.innerHTML = `
            <tr>
                <td colspan="3" class="p-3 text-gray-600 text-center">No billing history found</td>
            </tr>
        `;
        return;
    }

    bills.forEach(bill => {
        const dueDate = new Date(bill.due_date);
        const paymentDate = new Date(bill.payment_date);
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="p-3">${bill.amount.toFixed(2)} PHP</td>
            <td class="p-3">${dueDate.toLocaleDateString()}</td>
            <td class="p-3">
                <span class="text-green-500">Paid on ${paymentDate.toLocaleDateString()}</span>
            </td>
        `;
        billHistoryTable.appendChild(row);
    });
}

// Utility Function: Get Status Class for Styling
function getStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'text-yellow-500';  // Yellow for pending
        case 'paid':
            return 'text-green-500';   // Green for paid
        case 'overdue':
            return 'text-red-500';     // Red for overdue
        default:
            return 'text-gray-500';    // Gray for unknown
    }
}

// Send Notifications (Simulated)
function sendNotification(message) {
    alert(message);
}

// Notify Due Bills
async function checkDueBills() {
    const user = getUserDetails();
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
