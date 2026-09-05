import json
from sqlalchemy.orm import Session
from backend.app import models

class EvidenceService:
    def gather_and_assess_evidence(self, chargeback: models.Chargeback, db: Session) -> dict:
        transaction = chargeback.transaction
        customer = transaction.customer
        
        # Calculate evidence strength
        strength = 30
        
        # Mismatch checks
        if transaction.billing_shipping_match:
            strength += 15
        if transaction.IP_shipping_match:
            strength += 15
            
        # Customer history
        if customer.previous_transaction_count > 3:
            strength += 20
        elif customer.previous_transaction_count > 0:
            strength += 10
            
        if customer.previous_chargeback_count == 0:
            strength += 15
        else:
            strength -= 15
            
        # Device consistency
        if transaction.device_account_count == 1:
            strength += 10
        elif transaction.device_account_count > 3:
            strength -= 20
            
        # Payment failure friction
        if transaction.failed_payment_count > 2:
            strength -= 15
            
        strength = max(10, min(95, strength))
        
        # Action Recommendation
        if strength >= 70:
            recommended_action = "RESPOND TO CHARGEBACK"
            reason = "The dispute features a robust profile with matching location markers, an established buyer profile, and no previous chargeback history, making it highly winnable."
        elif strength >= 40:
            recommended_action = "INVESTIGATE"
            reason = "Mixed signals detected. Although some customer data is verified, device overlaps or minor payment friction warrants a manual investigation before responding."
        else:
            recommended_action = "ACCEPT LOSS"
            reason = "High likelihood of fraud or service failure. The transaction has multiple anomalies, multiple failed payment attempts, and device overlaps. Representment is highly likely to fail."
            
        # Generate Evidence summary paragraph
        summary_lines = []
        if transaction.billing_shipping_match and transaction.IP_shipping_match:
            summary_lines.append(f"The transaction shows geographic consistency: the customer's billing country matches the shipping country ({transaction.customer_country}) and matches the IP origin location.")
        else:
            summary_lines.append(f"Geographic mismatches detected. Shipping country is {transaction.shipping_country} while billing country is {transaction.customer_country}.")
            
        if customer.previous_transaction_count > 0:
            summary_lines.append(f"The buyer has an active account for {customer.account_age_days} days with {customer.previous_transaction_count} successful transactions prior to this order, indicating an established relationship.")
        else:
            summary_lines.append("This is a newly created account with no prior transaction history.")
            
        if transaction.device_account_count == 1:
            summary_lines.append("The device fingerprint used for this checkout has only been associated with this single account.")
        else:
            summary_lines.append(f"The device fingerprint has been linked to {transaction.device_account_count} distinct user accounts, representing a potential account takeover or multi-account registration.")
            
        evidence_summary = " ".join(summary_lines)
        
        # Compile individual evidence checklist items
        items = [
            {
                "evidence_type": "Transaction Authorization Record",
                "status": "AVAILABLE",
                "value": f"Payment method: {transaction.payment_method.replace('_', ' ').title()}. Status: Approved. Reference ID: CARD-TEST-{transaction.id.split('-')[-1]}.",
                "confidence": 95,
                "source_record": f"payment_gateway_logs:{transaction.id}"
            },
            {
                "evidence_type": "Customer Account History",
                "status": "AVAILABLE",
                "value": f"Buyer name: {customer.name}, account created {customer.account_age_days} days ago. Average Order Value: INR {customer.average_order_value:.2f}.",
                "confidence": 90,
                "source_record": f"customers:{customer.id}"
            },
            {
                "evidence_type": "Previous Successful Orders",
                "status": "AVAILABLE" if customer.previous_transaction_count > 0 else "UNAVAILABLE",
                "value": f"Customer has successfully processed {customer.previous_transaction_count} previous orders without chargebacks." if customer.previous_transaction_count > 0 else "No previous successful transactions found. Evidence unavailable.",
                "confidence": 85 if customer.previous_transaction_count > 0 else 0,
                "source_record": f"transactions:customer_id={customer.id}"
            },
            {
                "evidence_type": "Device Consistency Record",
                "status": "AVAILABLE",
                "value": f"Device fingerprint: DEV-FPR-{transaction.device_id[:6].upper()}. Shared accounts: {transaction.device_account_count}. Device age: {transaction.device_age_days} days.",
                "confidence": 80,
                "source_record": f"device_registry:{transaction.device_id}"
            },
            {
                "evidence_type": "Shipping Verification",
                "status": "AVAILABLE",
                "value": f"Delivery to shipping country: {transaction.shipping_country}. Billing match: {'Yes' if transaction.billing_shipping_match else 'No'}.",
                "confidence": 90,
                "source_record": f"shipping_fulfillment:{transaction.id}"
            },
            {
                "evidence_type": "Payment Attempt Logs",
                "status": "AVAILABLE",
                "value": f"Total checkout attempts: {transaction.failed_payment_count + 1}. Failed attempts: {transaction.failed_payment_count}.",
                "confidence": 85,
                "source_record": f"payment_gateway_attempts:{transaction.id}"
            }
        ]
        
        return {
            "evidence_strength": strength,
            "evidence_summary": evidence_summary,
            "suggested_action": recommended_action,
            "reason": reason,
            "evidence_items": items
        }

evidence_service = EvidenceService()
