import React, { useEffect, useState } from "react";
import "./Payment.css";
import { useStateValue } from "../StateProvider";
import CheckoutProduct from "../components/CheckoutProduct";
import { Link, useNavigate } from "react-router-dom";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { getCartTotal } from "../reducer";
import axios from "../axios";
import { db } from "../firebase";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";

export default function Payment() {
  const stripe = useStripe();
  const elements = useElements();

  const navigate = useNavigate();

  const [{ cart, user }, dispatch] = useStateValue();

  const [succeeded, setSucceeded] = useState(false);
  const [processing, setProcessing] = useState("");
  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(true);
  const [clientSecret, setClientSecret] = useState(true);

  // console.log("THE SECRET IS >>> ", clientSecret);
  // console.log("user --->", user.uid);

  useEffect(() => {
    // generate the special stripe secret which allows us to charge a customer
    const getClientSecret = async () => {
      const response = await axios({
        method: "post",
        // Stripe expects the total in a currencies subunits
        url: `/payments/create?total=${getCartTotal(cart) * 100}`,
      });
      setClientSecret(response.data.clientSecret);
    };

    getClientSecret();
  }, [cart]);

  async function handleSubmit(e) {
    // Stripe logic
    e.preventDefault();
    setProcessing(true);

    const payload = await stripe
      .confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      })
      .then(({ paymentIntent }) => {
        // paymentIntent = payment confirmation

        // pushing purchase details to firestore
        const userDocId = user?.uid;
        const orderId = paymentIntent.id;

        if (userDocId && orderId) {
          const usersCollection = collection(db, "users");
          const userDocRef = doc(usersCollection, userDocId);

          const userOrdersCollection = collection(userDocRef, "orders");
          const orderDocRef = doc(userOrdersCollection, orderId);

          const orderData = {
            cart: cart,
            amount: paymentIntent.amount,
            created: paymentIntent.created,
          };

          setDoc(orderDocRef, orderData)
            .then(() => {
              console.log("Order document written successfully!");
            })
            .catch((error) => {
              console.error("Error writing order document: ", error);
            });
        } else {
          console.error("User ID or Order ID is undefined.");
        }

        setSucceeded(true);
        setError(null);
        setProcessing(false);

        dispatch({
          type: "EMPTY_CART",
        });

        navigate("/orders", { replace: true });
      });
  }

  function handleChange(e) {
    // handle change
    setDisabled(e.empty);
    setError(e.error ? e.error.message : "");
  }

  const price = getCartTotal(cart) > 0 ? `$${getCartTotal(cart)}` : 0;

  return (
    <div className="payment">
      <div className="payment__container">
        <h1>
          Checkout(
          <Link to="/checkout">{cart?.length}</Link>)
        </h1>

        {/* Payment section - delivery address */}
        <div className="payment__section">
          <div className="payment__title">
            <h3>Delivery Address</h3>
          </div>
          <div className="payment__address">
            <p>{user?.email}</p>
            <p>3-K-23 CHB Owl City</p>
            <p>Sanandreas, USA</p>
          </div>
        </div>

        {/* Payment section - Review items */}
        <div className="payment__section">
          <div className="payment__title">
            <h3>Review Items and Delivery</h3>
          </div>
          <div className="payment__items">
            {cart.map((item) => (
              <CheckoutProduct
                id={item.id}
                title={item.title}
                image={item.image}
                price={item.price}
                rating={item.rating}
              />
            ))}
          </div>
        </div>

        {/* Payment section - Payement method */}
        <div className="payment__section">
          <div className="payment__title">
            <h3>Payment Method</h3>
          </div>
          <div className="payment__details">
            {/* STRIPE MAGIC!!! */}
            <form onSubmit={handleSubmit}>
              <CardElement onChange={handleChange} />
              <div>
                <div>
                  <strong>
                    Order Total({cart.length} items): {price}
                  </strong>
                </div>
                <button disabled={processing || disabled || succeeded}>
                  <span>{processing ? <p>Processing</p> : "Buy Now"}</span>
                </button>
              </div>
              {/* Errors */}
              {error && <div>{error}</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
