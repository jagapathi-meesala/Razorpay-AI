import os
import pandas as pd
import numpy as np

def generate_dataset(num_records=20000, seed=42):
    np.random.seed(seed)
    
    print(f"Generating {num_records} synthetic transaction records with continuous features...")
    
    # Base lists
    payment_methods = ['credit_card', 'debit_card', 'upi', 'net_banking']
    countries = ['IN', 'US', 'GB', 'AE', 'SG', 'CA', 'AU', 'DE', 'FR', 'JP']
    
    # Generate columns
    transaction_ids = [f"TXN-{10000 + i}" for i in range(num_records)]
    customer_ids = [f"CUSTOMER-{10000 + np.random.randint(1, 5000)}" for _ in range(num_records)]
    
    amounts = []
    transaction_hours = np.random.randint(0, 24, size=num_records)
    account_ages = np.random.randint(0, 1000, size=num_records)
    prev_txn_counts = []
    prev_cb_counts = []
    failed_pmt_counts = np.where(
        np.random.rand(num_records) < 0.08,
        np.random.randint(3, 8, size=num_records),   # 8% of cases: 3-7 failures
        np.random.poisson(0.5, size=num_records)     # 92%: normal 0-2
    )
    device_account_counts = []
    ip_account_counts = []
    billing_shipping_matches = []
    ip_shipping_matches = []
    pmt_methods = np.random.choice(payment_methods, size=num_records, p=[0.5, 0.2, 0.2, 0.1])
    cust_countries = np.random.choice(countries, size=num_records, p=[0.6, 0.1, 0.05, 0.05, 0.05, 0.03, 0.03, 0.03, 0.03, 0.03])
    ship_countries = []
    device_ages = []
    txn_frequencies = []
    avg_txn_amounts = []
    amount_deviations = []
    is_new_devices = []
    is_new_locations = []
    velocity_1hs = []
    velocity_24hs = []
    prev_fraud_flags = []
    
    # Populate correlations and details
    for i in range(num_records):
        age = account_ages[i]
        
        if age < 7:
            prev_txns = 0
            prev_cb = 0
            avg_amt = np.random.uniform(500, 3000)
            txn_freq = 0.0
            prev_fraud = 0
        else:
            prev_txns = int(np.random.gamma(shape=5, scale=4))
            # 6% chance of high chargeback history (2-4), otherwise low (0-1)
            if np.random.rand() < 0.06 and prev_txns > 5:
                prev_cb = np.random.randint(2, 5)
            elif np.random.rand() < 0.10 and prev_txns > 5:
                prev_cb = 1
            else:
                prev_cb = 0
            avg_amt = max(100.0, float(np.random.normal(2500, 1000)))
            txn_freq = round(float(np.random.uniform(0.1, 5.0)), 2)
            prev_fraud = 1 if (prev_cb > 0 or np.random.rand() < 0.02) else 0
            
        prev_txn_counts.append(prev_txns)
        prev_cb_counts.append(prev_cb)
        avg_txn_amounts.append(round(avg_amt, 2))
        txn_frequencies.append(txn_freq)
        prev_fraud_flags.append(prev_fraud)
        
        # Transaction Amount with continuous spectrum
        if np.random.rand() < 0.08:
            amt = avg_amt * np.random.uniform(2.5, 8.0)
        else:
            amt = avg_amt * np.random.uniform(0.4, 2.0)
        amt = max(50.0, round(amt, 2))
        amounts.append(amt)
        amount_deviations.append(round(amt / avg_amt, 2))
        
        # Device details
        is_new_dev = 1 if (age < 15 or np.random.rand() < 0.15) else 0
        is_new_devices.append(is_new_dev)
        
        if is_new_dev:
            dev_age = np.random.randint(0, 10)
            dev_accts = np.random.randint(1, 3)
        else:
            dev_age = np.random.randint(10, 500)
            dev_accts = 1
            
        # 10% chance of multi-account device (2-9 accounts) for richer gradient
        if np.random.rand() < 0.10:
            dev_accts = np.random.randint(2, 10)
            dev_age = np.random.randint(0, 60)
            
        device_ages.append(dev_age)
        device_account_counts.append(dev_accts)
        
        # IP account count
        ip_accts = dev_accts if np.random.rand() < 0.7 else np.random.randint(1, 8)
        ip_account_counts.append(ip_accts)
        
        # Countries and mismatches
        cust_c = cust_countries[i]
        bs_match = 0 if np.random.rand() < 0.10 else 1
        billing_shipping_matches.append(bs_match)
        
        if bs_match == 1:
            ship_c = cust_c
        else:
            ship_c = np.random.choice(countries)
        ship_countries.append(ship_c)
        
        ip_s_match = 1 if np.random.rand() < 0.88 else 0
        if bs_match == 0 and np.random.rand() < 0.5:
            ip_s_match = 0
        ip_shipping_matches.append(ip_s_match)
        
        # Location flags
        is_new_loc = 1 if (np.random.rand() < 0.12 or bs_match == 0) else 0
        is_new_locations.append(is_new_loc)
        
        # Velocity
        if np.random.rand() < 0.06:
            v1h = np.random.randint(3, 10)
            v24h = v1h + np.random.randint(3, 15)
        else:
            v1h = np.random.choice([0, 1, 2], p=[0.7, 0.2, 0.1])
            v24h = v1h + np.random.randint(0, 4)
        velocity_1hs.append(v1h)
        velocity_24hs.append(v24h)

    # Build DataFrame
    df = pd.DataFrame({
        'transaction_id': transaction_ids,
        'customer_id': customer_ids,
        'amount': amounts,
        'transaction_hour': transaction_hours,
        'account_age_days': account_ages,
        'previous_transaction_count': prev_txn_counts,
        'previous_chargeback_count': prev_cb_counts,
        'failed_payment_count': failed_pmt_counts,
        'device_account_count': device_account_counts,
        'IP_account_count': ip_account_counts,
        'billing_shipping_match': billing_shipping_matches,
        'IP_shipping_match': ip_shipping_matches,
        'payment_method': pmt_methods,
        'customer_country': cust_countries,
        'shipping_country': ship_countries,
        'device_age_days': device_ages,
        'transaction_frequency': txn_frequencies,
        'average_transaction_amount': avg_txn_amounts,
        'amount_deviation': amount_deviations,
        'is_new_device': is_new_devices,
        'is_new_location': is_new_locations,
        'velocity_1h': velocity_1hs,
        'velocity_24h': velocity_24hs,
        'previous_fraud_flag': prev_fraud_flags
    })
    
    # Calculate smooth continuous risk metric across all inputs
    continuous_risk = (
        df['failed_payment_count'] * 10.0 +
        df['previous_chargeback_count'] * 22.0 +
        df['previous_fraud_flag'] * 30.0 +
        np.maximum(0, df['device_account_count'] - 1) * 7.0 +
        np.maximum(0, df['IP_account_count'] - 1) * 5.0 +
        (1 - df['billing_shipping_match']) * 14.0 +
        (1 - df['IP_shipping_match']) * 10.0 +
        np.maximum(0, df['amount_deviation'] - 1.0) * 9.0 +
        df['velocity_1h'] * 7.0 +
        df['velocity_24h'] * 1.5 +
        df['is_new_device'] * 5.0 +
        df['is_new_location'] * 5.0 +
        np.maximum(0, 30 - df['account_age_days']) * 0.25
    )
    
    # Smooth probabilistic target label using logistic sigmoid function with high separability
    prob_true = 1.0 / (1.0 + np.exp(-(continuous_risk - 32.0) / 4.0))
    labels = (np.random.rand(num_records) < prob_true).astype(int)
    df['chargeback_label'] = labels
    
    # Save dataset
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/transactions.csv', index=False)
    print(f"Continuous dataset generated successfully and saved to data/transactions.csv. Shape: {df.shape}")
    print(f"Fraud (chargeback) rate: {df['chargeback_label'].mean() * 100:.2f}%")

if __name__ == '__main__':
    generate_dataset()
