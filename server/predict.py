from flask import Flask, jsonify
from flask_cors import CORS
import sqlite3
import pandas as pd
import numpy as np
import re
import traceback

from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error

app = Flask(__name__)

# enable CORS for localhost
CORS(app, resources={r"/api/*": {"origins": "*"}})

DB_PATH = "inventory.db"


def clean_number(value):
    """
    Convert '$1,200.50' -> 1200.50
    """
    if pd.isna(value):
        return np.nan

    cleaned = re.sub(r'[^0-9.+\-eE]', '', str(value))

    try:
        return float(cleaned)
    except ValueError:
        return np.nan


def load_data():
    conn = sqlite3.connect(DB_PATH)
    query = """
        SELECT id, product_name, product_standard_cost, product_list_price, order_item_quantity, profit
        FROM raw_data
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df


@app.route('/api/ds/predict', methods=['GET'])
def predict():
    try:
        df = load_data()

        # clean columns
        df["cost"] = df["product_standard_cost"].apply(clean_number)
        df["price"] = df["product_list_price"].apply(clean_number)
        df["qty"] = df["order_item_quantity"].apply(clean_number)
        df["profit"] = df["profit"].apply(clean_number)

        # training dataset
        train_df = df.dropna(subset=["cost", "price", "qty", "profit"]).copy()
        if len(train_df) < 3:
            return jsonify({"error": "Not enough numeric rows to build model"}), 400
        
        X = train_df[["cost", "price", "qty"]]
        y = train_df["profit"]
        
        model = LinearRegression()
        model.fit(X, y)

        # metrics
        y_pred_train = model.predict(X)

        r2 = r2_score(y, y_pred_train)
        rmse = np.sqrt(mean_squared_error(y, y_pred_train))

        # predict all rows
        mean_cost = train_df["cost"].mean()
        mean_price = train_df["price"].mean()
        mean_qty = train_df["qty"].mean()
        df["cost_filled"] = df["cost"].fillna(mean_cost)
        df["price_filled"] = df["price"].fillna(mean_price)
        df["qty_filled"] = df["qty"].fillna(mean_qty)
        
        X_all = df[["cost_filled", "price_filled", "qty_filled"]]
        X_all.columns = ["cost", "price", "qty"]
        df["predicted"] = model.predict(X_all).round(4)

        # response format
        predictions = df.apply(
            lambda row: {
                "id": int(row["id"]),
                "name": row["product_name"] or "",
                "cost": None if pd.isna(row["cost"]) else float(row["cost"]),
                "price": None if pd.isna(row["price"]) else float(row["price"]),
                "qty": None if pd.isna(row["qty"]) else float(row["qty"]),
                "profit": None if pd.isna(row["profit"]) else float(row["profit"]),
                "predicted": float(row["predicted"])
            },
            axis=1
        ).tolist()

        return jsonify({
            "model": {
                "intercept": round(float(model.intercept_), 6),
                "slope": round(float(model.coef_[0]), 6),
                "trained_on": int(len(train_df)),
                "r2_score": round(float(r2), 6),
                "rmse": round(float(rmse), 6)
            },
            "predictions": predictions
        })

    except Exception as e:
        print(traceback.format_exc()) 
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)