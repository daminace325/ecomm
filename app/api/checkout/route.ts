import { getUserFromNextRequest } from "@/lib/auth_server";
import { cartsCollection, productsCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const carts = await cartsCollection();
        const cart = await carts.findOne({ userId: user._id });

        if (!cart) {
            return NextResponse.json({ error: "Cart not found" }, { status: 404 });
        }

        if (!cart.items || cart.items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        const productIds = cart.items.map(item => item.productId);

        const products = await productsCollection();
        const productDocs = await products.find({ _id: { $in: productIds } }).toArray();

        if (productDocs.length !== productIds.length) {
            return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
        }

        let subtotal = 0;

        const items = cart.items.map(cartItem => {
            const product = productDocs.find(p => p._id === cartItem.productId);
            if (!product) {
                throw new Error("Product mismatch during checkout");
            }

            if (product.stock < cartItem.qty) {
                return {
                    error: `Insufficient stock for product for product ${product._id}`,
                    productId: product._id
                };
            }

            const lineTotal = product.price * cartItem.qty;
            subtotal += lineTotal;

            return {
                productId: product._id,
                title: product.title,
                unitPrice: product.price,
                qty: cartItem.qty,
                lineTotal
            }
        });

        const stockError = items.find((i: any) => i.error);
        if (stockError) {
            return NextResponse.json({ error: "Insufficient Stock", productId: stockError.productId }, { status: 409 });
        }

        const total = subtotal;

        return NextResponse.json({
            cartId: cart._id,
            items,
            subtotal,
            total
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to checkout" }, { status: 500 });
    }
}