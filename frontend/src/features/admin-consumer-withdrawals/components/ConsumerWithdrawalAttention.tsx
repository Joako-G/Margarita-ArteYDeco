import { CircleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'

import { useConsumerWithdrawalAttentionCount } from '../hooks/useConsumerWithdrawalAttentionCount'
import '../admin-consumer-withdrawals.css'

export function ConsumerWithdrawalAttention() {
  const { count, isPending } = useConsumerWithdrawalAttentionCount()
  if (!isPending && count === 0) return null
  return <section aria-labelledby="withdrawal-attention-title" className="admin-withdrawals__dashboard-alert"><CircleAlert aria-hidden="true" size={24} /><div><h2 id="withdrawal-attention-title">Arrepentimientos que requieren atención</h2><p>{isPending ? 'Consultando solicitudes…' : `${count} ${count === 1 ? 'solicitud necesita' : 'solicitudes necesitan'} revisión.`}</p></div><Link className="ui-button ui-button--secondary" to={`${routes.adminConsumerWithdrawals}?compliance=attention`}>Ver solicitudes</Link></section>
}
