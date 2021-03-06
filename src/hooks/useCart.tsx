import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const currentCart = [...cart];
      const { data: product } = await api.get<Product>(`products/${productId}`);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      const foundProduct = currentCart.find(product => product.id === productId);
      const currentAmount = foundProduct ? foundProduct.amount : 0;

      if (stock.amount < currentAmount + 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (foundProduct) {
        foundProduct.amount = currentAmount + 1;
      } else {
        currentCart.push({ ...product, amount: 1 })
      }

      setCart(currentCart);

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const currentCart = [...cart];
      const foundIndex = currentCart.findIndex((product) => product.id === productId);

      if (foundIndex !== -1) {
        currentCart.splice(foundIndex, 1);
        setCart(currentCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const currentCart = [...cart];
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      const foundProduct = currentCart.find(product => product.id === productId);

      if (amount < 1) return;

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (foundProduct) {
        foundProduct.amount = amount;
        setCart(currentCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
