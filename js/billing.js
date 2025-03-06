// js/billing.js
import { supabase } from "../db/supabase.js";

// Fetch Bills
async function fetchBills() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("tenant_id", user.id)
        .order("due_date", { ascending: true });

    if (data) {
        const billList = document.getElementById("billList");
        billList.innerHTML = "";
        data.forEach(bill => {
            billList.innerHTML += `
                <div class="bill">
                    <p>Amount: $${bill.amount} - Due: ${new Date(bill.due_date).toDateString()}</p>
                    <p>Status: ${bill.status}</p>
                </div>
            `;
        });
    }
}

// Send Notifications (Simulated)
function sendNotification(message) {
    alert(message);
}

// Notify Due Bills
async function checkDueBills() {
    const { data: { user } } = await supabase.auth.getUser();
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
    fetchBills();
    setInterval(checkDueBills, 60000); // Check every minute
});
