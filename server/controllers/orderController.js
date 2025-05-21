import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripe from "stripe";
import User from "../models/User.js";

// export const placeOrderCOD = async (req, res) => {
//   try {
//     const { userId, items, address } = req.body;

//     if (!address || items.length === 0) {
//       return res.json({
//         success: false,
//         message: "Invaild Data",
//       });
//     }
//     let amount = await items.reduce(async (acc, item) => {
//       const product = await Product.findById(item.product);
//       return (await acc) + product.offerPrice * item.quantity;
//     }, 0);
//     // Add tax charge (2%)
//     amount += Math.floor(amount * 0.02);
//     await Order.create({
//       userId,
//       items,
//       amount,
//       address,
//       paymentType: "COD",
//       isPaid: false,
//     });
//     return res.json({
//       success: true,
//       message: "Order Placed Successfully",
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    const { origin } = req.headers;

    if (!address || items.length === 0) {
      return res.json({ success: false, message: "Inavild data" });
    }

    let productData = [];

    let amount = await items.reduce(async (acc, item) => {
      const product = await Product.findById(item.product);
      productData.push({
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
      });
      return (await acc) + product.offerPrice * item.quantity;
    }, 0);
    amount += Math.floor(amount * 0.02);

    const order = await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "Online",
    });
    // Stripe Gateway

    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    // create line items for stripe
    const line_items = productData.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.floor(item.price + item.price * 0.02) * 100,
        },
        quantity: item.quantity,
      };
    });
    // create session
    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader?next=my-orders`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId,
      },
    });
    return res.json({ success: true, url: session.url });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//Stripe webhooks to overify payment action

export const stripeWebHooks = async (req, res) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECERT
    );
  } catch (error) {
    console.log(error);
    res.status(400).send(`Webhook Error :{error.message}`);
  }
  // handle event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;
      // Getting session metadata
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });
      const { orderId, userId } = session.data[0].metadata;
      // Mark payment as paid
      await Order.findByIdAndUpdate(orderId, {
        isPaid: true,
      });
      await User.findByIdAndUpdate(userId, { cartItems: {} });
      break;
    }
    case "payment_intent.failed": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;
      // Getting session metadata
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });
      const { orderId } = session.data[0].metadata;
      await Order.findByIdAndDelete(orderId);
      break;
    }
    default:
      console.error(`Unhandle event type ${event.type}`);
      break;
  }
  res.json({
    received: true,
  });
};

export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address } = req.body;

    // Check explicitly for userId
    if (!userId || !address || items.length === 0) {
      return res.json({
        success: false,
        message: "Invalid Data: User ID, address, or items missing",
      });
    }

    let amount = await items.reduce(async (acc, item) => {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found`);
      }
      return (await acc) + product.offerPrice * item.quantity;
    }, 0);

    // Add tax charge (2%)
    amount += Math.floor(amount * 0.02);

    const newOrder = await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "COD",
      isPaid: false,
    });

    return res.json({
      success: true,
      message: "Order Placed Successfully",
      orderId: newOrder._id,
    });
  } catch (error) {
    console.log("Order creation error:", error.message);
    res.json({
      success: false,
      message: error.message,
    });
  }
};
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.userId;

    // Check if userId exists
    if (!userId) {
      return res.json({
        success: false,
        message: "User ID is required",
      });
    }

    const orders = await Order.find({
      userId,
      $or: [
        {
          paymentType: "COD",
        },
        {
          isPaid: true,
        },
      ],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.log("Error in getUserOrders:", error.message);
    res.json({
      success: false, // Changed to false to properly indicate an error
      message: error.message,
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        {
          paymentType: "COD",
        },
        {
          isPaid: true,
        },
      ],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.log(error.message);
    res.json({
      success: false,
      message: error.message,
    });
  }
};
