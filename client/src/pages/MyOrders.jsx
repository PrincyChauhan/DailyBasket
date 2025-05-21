import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";

const MyOrders = () => {
  const [myOrders, setMyOrders] = useState([]);
  const { currency, axios, user } = useAppContext();

  const fetchMyOrders = async () => {
    try {
      const { data } = await axios.get("/api/order/user");
      console.log(data);
      if (data.success) {
        setMyOrders(data.orders);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyOrders();
    }
  }, []);

  return (
    <div className="mt-16 pb-16">
      <div className="flex flex-col items-end w-max mb-8">
        <p className="text-2xl font-medium uppercase">My Orders</p>
        <div className="w-16 h-0.5 bg-primary-dull rounded-full"></div>
      </div>

      {myOrders.map((order, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md border border-gray-200 mb-8 p-6 max-w-4xl"
        >
          {/* Order Header */}
          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <span>OrderId : {order._id}</span>
            <span>Payment : {order.paymentType}</span>
            <span>
              Total Amount : {currency}
              {order.amount}
            </span>
          </div>

          {/* Order Items */}
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between gap-4 py-4 ${
                order.items.length !== idx + 1 ? "border-b border-gray-200" : ""
              }`}
            >
              {/* Left: Image and Name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <img
                    src={item.product.image[0]}
                    alt={item.product.name}
                    className="w-14 h-14 object-cover"
                  />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-800">
                    {item.product.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Category: {item.product.category}
                  </p>
                </div>
              </div>

              {/* Center: Quantity, Status, Date */}
              <div className="flex flex-col justify-center md:ml-8 mb-4 md:mb-0">
                <p className="text-gray-600">Quantity: {item.quantity || 1}</p>
                <p className=" text-gray-600">Status: {order.status}</p>
                <p className=" text-gray-600">
                  Date: {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Right: Amount */}
              <div className="text-primary-dull text-md font-semibold text-right whitespace-nowrap">
                Amount: {currency} {item.product.price * item.quantity}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MyOrders;
