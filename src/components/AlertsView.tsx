import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  Boxes,
  Building2,
  CheckCircle2,
  Phone,
  Mail,
  Eye,
  ShoppingCart,
  TrendingDown
} from 'lucide-react';
import { Product, Provider } from '../types';

interface AlertsViewProps {
  products: Product[];
  providers: Provider[];
  onOpenMovement: (type: 'entrada', productId: string) => void;
  onSelectProduct: (productId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  products,
  providers,
  onOpenMovement,
  onSelectProduct,
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  const alertProducts = products.filter((p) => p.en_alerta);

  return (
    <div className="space-y-6 pb-12">
      {/* Header - Bento Card */}
      <div className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Alertas de Stock Mínimo
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {alertProducts.length} {alertProducts.length === 1 ? 'producto crítico' : 'productos críticos'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Artículos cuyas existencias disponibles están en o por debajo del umbral mínimo configurado.
              </p>
            </div>
          </div>
        </div>
      </div>

      {alertProducts.length === 0 ? (
        <div className="bento-card p-12 text-center text-slate-600">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">¡Almacén con stock óptimo!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Ningún producto se encuentra por debajo de su stock mínimo de seguridad. Todos los materiales cuentan con existencias suficientes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {alertProducts.map((p) => {
            const deficit = p.stock_minimo - p.stock_disponible;
            const provider = providers.find((pr) => pr.id === p.proveedor_id);

            return (
              <div
                key={p.id}
                className="bento-card p-6 flex flex-col justify-between relative overflow-hidden group border-rose-300/80 bg-rose-50/15"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200">
                      {p.codigo}
                    </span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-100/90 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Déficit: -{deficit > 0 ? deficit : 0} uds
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectProduct(p.id)}
                    className="font-bold text-slate-900 text-base text-left hover:text-[#EA1D24] transition-colors block leading-snug"
                  >
                    {p.nombre}
                  </button>
                  <span className="text-xs text-slate-500 block mt-0.5">{p.categoria}</span>

                  {/* Stock Metrics comparison - 3-cell Bento */}
                  <div className="grid grid-cols-3 gap-2 my-4 text-center text-xs">
                    <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl">
                      <span className="text-[10px] font-bold text-rose-700 block uppercase">
                        Disponible
                      </span>
                      <span className="font-mono font-extrabold text-rose-800 text-base">
                        {p.stock_disponible}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                        Mínimo
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-base">
                        {p.stock_minimo}
                      </span>
                    </div>

                    <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                      <span className="text-[10px] font-semibold text-amber-700 block uppercase">
                        Físico
                      </span>
                      <span className="font-mono font-bold text-amber-800 text-base">
                        {p.stock_actual}
                      </span>
                    </div>
                  </div>

                  {/* Provider information */}
                  {provider && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 mb-4 space-y-1.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#EA1D24]" />
                        <span>{provider.nombre}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        {provider.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {provider.telefono}
                          </span>
                        )}
                        {provider.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {provider.email}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectProduct(p.id)}
                    className="px-3 py-2 text-slate-600 hover:text-[#EA1D24] hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Detalle</span>
                  </button>

                  <button
                    id={`btn-alert-reponer-${p.id}`}
                    onClick={() => onOpenMovement('entrada', p.id)}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Reponer Material</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
