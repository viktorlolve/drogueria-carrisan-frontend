import { useCart } from '../context/CartContext'
import { ProductoImagen } from './icons/ProductoImagen'

function CartSummary({ tasaVes }) {
  const { items, removeItem, updateCantidad, total } = useCart()

  if (items.length === 0) {
    return <p>Tu carrito está vacío</p>
  }

  return (
    <div className="cart-summary">
      {items.map((item) => (
        <div key={item.producto.id} className="cart-item">
          <ProductoImagen
            src={item.producto.foto_url}
            alt={item.producto.nombre}
            width="50"
          />
          <span>{item.producto.nombre}</span>

          <input
            type="number"
            min="1"
            value={item.cantidad}
            onChange={(e) =>
              updateCantidad(item.producto.id, Number(e.target.value))
            }
          />

          <span>${(item.producto.precio_usd * item.cantidad).toFixed(2)}</span>

          <button onClick={() => removeItem(item.producto.id)}>Quitar</button>
        </div>
      ))}

      <hr />

      <p>
        <strong>Total: ${total.toFixed(2)}</strong>
        {tasaVes && <span> — Bs. {(total * tasaVes).toFixed(2)}</span>}
      </p>
    </div>
  )
}

export default CartSummary