from backend.app.services.prediction import prediction_service

class ExplainabilityService:
    def explain_decision(self, transaction_data: dict, risk_score: int) -> dict:
        """
        Calculates positive and negative signals for the transaction.
        Positive signals = factors reducing risk (e.g. billing matches, old customer account).
        Negative signals = factors increasing risk (risk factors).
        """
        # Run prediction service to get negative risk factors
        result = prediction_service.predict_risk(transaction_data)
        negative_signals = result.get('risk_factors', [])
        
        # Calculate positive/trust signals
        positive_signals = []
        
        if transaction_data.get('billing_shipping_match', True):
            positive_signals.append({
                'factor': 'billing_shipping_match',
                'description': 'Billing and shipping address countries match exactly',
                'strength': 'STRONG'
            })
            
        if transaction_data.get('IP_shipping_match', True):
            positive_signals.append({
                'factor': 'IP_shipping_match',
                'description': 'IP address location matches physical delivery country',
                'strength': 'MEDIUM'
            })
            
        if int(transaction_data.get('account_age_days', 0)) > 90:
            positive_signals.append({
                'factor': 'account_age_days',
                'description': f"Established customer account (age: {transaction_data['account_age_days']} days)",
                'strength': 'STRONG' if int(transaction_data['account_age_days']) > 365 else 'MEDIUM'
            })
            
        if int(transaction_data.get('previous_transaction_count', 0)) > 5 and int(transaction_data.get('previous_chargeback_count', 0)) == 0:
            positive_signals.append({
                'factor': 'customer_history',
                'description': f"Good customer relationship with {transaction_data['previous_transaction_count']} prior successful transactions",
                'strength': 'STRONG'
            })
            
        if int(transaction_data.get('device_account_count', 1)) == 1:
            positive_signals.append({
                'factor': 'device_reputation',
                'description': 'Device fingerprint unique to this customer account',
                'strength': 'MEDIUM'
            })
            
        if int(transaction_data.get('failed_payment_count', 0)) == 0:
            positive_signals.append({
                'factor': 'payment_success',
                'description': 'Payment authorized on first attempt without session failures',
                'strength': 'MEDIUM'
            })
            
        return {
            'risk_score': risk_score,
            'probability': result.get('probability', 0.0),
            'model_confidence': result.get('model_confidence', 50),
            'negative_signals': negative_signals,
            'positive_signals': positive_signals[:4], # limit to top 4 signals
            'decision_reasoning': self._generate_reasoning(risk_score, negative_signals)
        }

    def _generate_reasoning(self, risk_score: int, negative_signals: list) -> str:
        if risk_score < 30:
            return "This transaction displays no major risk indicators. Customer identity matches location parameters, and historical patterns align with healthy behavior."
        elif risk_score < 70:
            if negative_signals:
                primary = negative_signals[0]['description']
                return f"Medium risk classification. The primary risk signal is: {primary}. Manual verification is recommended."
            return "Medium risk score due to minor signal deviations. Recommended action is to verify customer details."
        else:
            if len(negative_signals) >= 2:
                primary = negative_signals[0]['description']
                secondary = negative_signals[1]['description']
                return f"High risk transaction triggered by multiple compounding fraud signals. Chiefly: {primary}, and {secondary}. Strongly suggest manual inspection or dispute escalation."
            elif negative_signals:
                primary = negative_signals[0]['description']
                return f"High risk transaction. Major risk driver: {primary}."
            return "High risk transaction classified by model based on transaction velocity and account age characteristics."

explainability_service = ExplainabilityService()
