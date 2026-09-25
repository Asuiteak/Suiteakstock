/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { api, getStoredUser, setStoredAuth } from './lib/api';
import {
  User,
  Product,
  Movement,
  Project,
  Provider,
  DashboardStats,
  MovementType,
  Role,
  MaterialRequest,
  RequestType,
  Category,
  Order,
} from './types';
import { Navbar, NavTab } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { MovementsView } from './components/MovementsView';
import { ProjectsView } from './components/ProjectsView';
import { AlertsView } from './components/AlertsView';
import { RequestsView } from './components/RequestsView';
import { OrdersView } from './components/OrdersView';
import { UsersView } from './components/UsersView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { MovementFormModal } from './components/MovementFormModal';
import { ProductFormModal } from './components/ProductFormModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ProjectFormModal } from './components/ProjectFormModal';
import { RequestFormModal } from './components/RequestFormModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { ProviderManagerModal } from './components/ProviderManagerModal';
import { OrderFormModal } from './components/OrderFormModal';
import { ReceiveOrderModal } from './components/ReceiveOrderModal';
import { RequestEditModal } from './components/RequestEditModal';
import { RequestHistoryModal } from './components/RequestHistoryModal';
import { DateTimeModal } from './components/DateTimeModal';
import { useAppTime } from './context/TimeContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const { isTimeModalOpen, closeTimeModal } = useAppTime();

  // Core Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementModalType, setMovementModalType] = useState<MovementType>('entrada');
  const [movementModalProductId, setMovementModalProductId] = useState<string | undefined>(undefined);
  const [movementModalProjectId, setMovementModalProjectId] = useState<string | undefined>(undefined);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);

  const [selectedProductIdForDetail, setSelectedProductIdForDetail] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Requests Modals & State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestModalDefaultType, setRequestModalDefaultType] = useState<RequestType>('preparar_carga');
  const [requestModalDefaultProductId, setRequestModalDefaultProductId] = useState<string | undefined>(undefined);
  const [requestModalDefaultProjectId, setRequestModalDefaultProjectId] = useState<string | undefined>(undefined);

  const [isRequestEditModalOpen, setIsRequestEditModalOpen] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState<MaterialRequest | null>(null);
  const [isRequestHistoryModalOpen, setIsRequestHistoryModalOpen] = useState(false);
  const [requestForHistory, setRequestForHistory] = useState<MaterialRequest | null>(null);

  // Orders Modals & State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderFromRequest, setOrderFromRequest] = useState<MaterialRequest | null>(null);
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [isReceiveOrderModalOpen, setIsReceiveOrderModalOpen] = useState(false);
  const [orderToReceive, setOrderToReceive] = useState<Order | null>(null);

  const handleStartOrderFromProduct = (product: Product | null) => {
    setOrderToEdit(null);
    setOrderFromRequest(null);
    setOrderProduct(product);
    setIsOrderModalOpen(true);
  };

  // Delete product confirmation
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const loadAllData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [statsData, productsData, movementsData, projectsData, providersData, usersData, requestsData, categoriesData, ordersData] =
        await Promise.all([
          api.getStats().catch(() => null),
          api.getProducts().catch(() => []),
          api.getMovements().catch(() => []),
          api.getProjects().catch(() => []),
          api.getProviders().catch(() => []),
          api.getUsers().catch(() => []),
          api.getRequests().catch(() => []),
          api.getCategories().catch(() => []),
          api.getOrders().catch(() => []),
        ]);

      if (statsData) setStats(statsData);
      setProducts(productsData);
      setCategories(categoriesData);
      setMovements(movementsData);
      setProjects(projectsData);
      setProviders(providersData);
      setUsersList(usersData);
      setRequests(requestsData);
      setOrders(ordersData);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      showToast('Error al sincronizar datos del almacén', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser, loadAllData]);

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    showToast(`Bienvenido/a, ${user.nombre} (${user.rol.toUpperCase()})`);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setCurrentTab('dashboard');
    showToast('Sesión cerrada correctamente', 'info');
  };

  const handleQuickSwitchRole = async (newRole: Role) => {
    // Quick role switch for live testing without re-logging
    const targetEmail = newRole === 'admin' ? 'admin@reformas.com' : 'carlos@reformas.com';
    const targetPass = newRole === 'admin' ? 'admin123' : 'operario123';
    try {
      const res = await api.login(targetEmail, targetPass);
      setCurrentUser(res.user);
      showToast(`Cambiado al perfil: ${res.user.nombre} [${res.user.rol.toUpperCase()}]`);
      loadAllData();
    } catch (err) {
      console.error('Error cambiando rol:', err);
    }
  };

  // Open Movement Modal
  const handleOpenNewMovement = (
    type: MovementType = 'entrada',
    productId?: string,
    projectId?: string
  ) => {
    setMovementModalType(type);
    setMovementModalProductId(productId);
    setMovementModalProjectId(projectId);
    setIsMovementModalOpen(true);
  };

  // Open Request Modal (Solicitud de Operario)
  const handleOpenNewRequest = (
    type: RequestType = 'preparar_carga',
    productId?: string,
    projectId?: string
  ) => {
    setRequestModalDefaultType(type);
    setRequestModalDefaultProductId(productId);
    setRequestModalDefaultProjectId(projectId);
    setIsRequestModalOpen(true);
  };

  // Handle scanned barcode
  const handleBarcodeScan = (scannedCode: string) => {
    const cleanCode = scannedCode.trim().toUpperCase();
    const foundProduct = products.find(
      (p) => p.codigo.toUpperCase() === cleanCode || p.id === scannedCode
    );

    if (foundProduct) {
      setSelectedProductIdForDetail(foundProduct.id);
      showToast(`Producto encontrado: [${foundProduct.codigo}] ${foundProduct.nombre}`, 'info');
    } else {
      if (currentUser?.rol === 'admin') {
        const confirmAdd = window.confirm(
          `No se encontró ningún producto con el código "${cleanCode}". ¿Deseas darlo de alta ahora?`
        );
        if (confirmAdd) {
          setProductToEdit({
            id: '',
            codigo: cleanCode,
            nombre: '',
            categoria: 'Materiales',
            stock_minimo: 5,
            fecha_creacion: '',
            stock_actual: 0,
            stock_fuera_almacen: 0,
            stock_reservado: 0,
            stock_disponible: 0,
            en_alerta: false,
          });
          setIsProductModalOpen(true);
        }
      } else {
        showToast(`No se encontró ningún producto con el código "${cleanCode}".`, 'error');
      }
    }
  };

  // Delete product action
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id);
      showToast(`Producto "${productToDelete.nombre}" eliminado`, 'info');
      setProductToDelete(null);
      setDeleteError(null);
      loadAllData();
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar producto');
    }
  };

  // If user not authenticated, show Login View
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const selectedProduct = products.find((p) => p.id === selectedProductIdForDetail) || null;
  const lowStockCount = stats?.productos_stock_bajo ?? products.filter((p) => p.en_alerta).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased w-full max-w-full overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        user={currentUser}
        onLogout={handleLogout}
        onQuickSwitchRole={handleQuickSwitchRole}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenNewMovement={() => handleOpenNewMovement('entrada')}
        lowStockCount={lowStockCount}
        pendingRequestsCount={stats?.solicitudes_pendientes ?? requests.filter((r) => r.estado === 'pendiente').length}
        pendingOrdersCount={orders.filter((o) => o.estado === 'pendiente' || o.estado === 'en_camino').length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-5 pb-12 overflow-x-hidden">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            loading={loading}
            onNavigate={setCurrentTab}
            onOpenNewMovement={handleOpenNewMovement}
            onOpenScanner={() => setIsScannerOpen(true)}
            onSelectProduct={(id) => setSelectedProductIdForDetail(id)}
            onNewProduct={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            onNewRequest={() => handleOpenNewRequest('preparar_carga')}
            movements={movements}
            projects={projects}
            requests={requests}
            orders={orders}
          />
        )}

        {currentTab === 'products' && (
          <ProductsView
            products={products}
            currentUser={currentUser}
            projects={projects}
            categoriesList={categories}
            orders={orders}
            providers={providers}
            onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
            onOpenProviderManager={() => setIsProviderModalOpen(true)}
            onSelectProduct={(id) => setSelectedProductIdForDetail(id)}
            onNewProduct={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            onEditProduct={(p) => {
              setProductToEdit(p);
              setIsProductModalOpen(true);
            }}
            onDeleteProduct={(p) => {
              setProductToDelete(p);
              setDeleteError(null);
            }}
            onOpenMovement={(type, pId) => handleOpenNewMovement(type, pId)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onReceiveOrder={(order) => {
              setOrderToReceive(order);
              setIsReceiveOrderModalOpen(true);
            }}
            onNavigateToOrders={() => setCurrentTab('orders')}
            onOrderProduct={handleStartOrderFromProduct}
            onUpdateProductStatus={async (pId, estado) => {
              try {
                await api.updateProduct(pId, { estado });
                showToast('Estado del producto actualizado');
                loadAllData();
              } catch (err: any) {
                showToast(err.message || 'Error al actualizar estado', 'error');
              }
            }}
          />
        )}

        {currentTab === 'movements' && (
          <MovementsView
            movements={movements}
            projects={projects}
            products={products}
            onNewMovement={handleOpenNewMovement}
            onSelectProduct={(id) => setSelectedProductIdForDetail(id)}
          />
        )}

        {currentTab === 'projects' && (
          <ProjectsView
            projects={projects}
            currentUser={currentUser}
            onNewProject={() => setIsProjectModalOpen(true)}
            onOpenMovement={handleOpenNewMovement}
            onSelectProduct={(id) => setSelectedProductIdForDetail(id)}
            onRefreshProjects={loadAllData}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'requests' && (
          <RequestsView
            requests={requests}
            currentUser={currentUser}
            projects={projects}
            products={products}
            onRefresh={loadAllData}
            onNewRequest={() => handleOpenNewRequest('preparar_carga')}
            onNewProductFromRequest={(initialData) => {
              setProductToEdit(initialData as any);
              setIsProductModalOpen(true);
            }}
            onEditRequest={(req) => {
              setRequestToEdit(req);
              setIsRequestEditModalOpen(true);
            }}
            onOpenHistory={(req) => {
              setRequestForHistory(req);
              setIsRequestHistoryModalOpen(true);
            }}
            onCreateOrderFromRequest={(req) => {
              setOrderFromRequest(req);
              setOrderToEdit(null);
              setIsOrderModalOpen(true);
            }}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'orders' && (
          <OrdersView
            orders={orders}
            currentUser={currentUser}
            providers={providers}
            projects={projects}
            products={products}
            requests={requests}
            onRefresh={loadAllData}
            onNewOrder={() => {
              setOrderToEdit(null);
              setOrderFromRequest(null);
              setIsOrderModalOpen(true);
            }}
            onEditOrder={(order) => {
              setOrderToEdit(order);
              setOrderFromRequest(null);
              setIsOrderModalOpen(true);
            }}
            onReceiveOrder={(order) => {
              setOrderToReceive(order);
              setIsReceiveOrderModalOpen(true);
            }}
            onOpenRequestHistory={(requestId) => {
              const matchedReq = requests.find((r) => r.id === requestId);
              if (matchedReq) {
                setRequestForHistory(matchedReq);
                setIsRequestHistoryModalOpen(true);
              } else {
                showToast('No se encontró la solicitud de origen', 'info');
              }
            }}
            onNavigateToProducts={() => setCurrentTab('products')}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'alerts' && (
          <AlertsView
            products={products}
            providers={providers}
            onOpenMovement={(type, pId) => handleOpenNewMovement(type, pId)}
            onSelectProduct={(id) => setSelectedProductIdForDetail(id)}
          />
        )}

        {currentTab === 'users' && currentUser.rol === 'admin' && (
          <UsersView
            currentUser={currentUser}
            onRefreshAll={loadAllData}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Floating Global Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      {/* Movement Form Modal (Entrada, Salida, Reserva) */}
      <MovementFormModal
        isOpen={isMovementModalOpen}
        defaultType={movementModalType}
        defaultProductId={movementModalProductId}
        products={products}
        projects={projects}
        users={usersList}
        currentUser={currentUser}
        onClose={() => setIsMovementModalOpen(false)}
        onSuccess={() => {
          showToast('Movimiento registrado correctamente en el almacén');
          loadAllData();
        }}
        onOpenScanner={() => {
          setIsScannerOpen(true);
        }}
      />

      {/* Product Form Modal (Create / Edit) */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        productToEdit={productToEdit}
        providers={providers}
        projects={projects}
        products={products}
        categoriesList={categories}
        onClose={() => {
          setIsProductModalOpen(false);
          setProductToEdit(null);
        }}
        onSuccess={(savedProduct) => {
          showToast(`Producto "${savedProduct.nombre}" guardado con éxito`);
          loadAllData();
        }}
      />

      {/* Product Details Modal */}
      <ProductDetailModal
        product={selectedProduct}
        currentUser={currentUser}
        providers={providers}
        onClose={() => setSelectedProductIdForDetail(null)}
        onProductUpdated={() => {
          loadAllData();
          showToast('Proveedor actualizado correctamente', 'success');
        }}
        onOpenNewMovement={(type, pId) => {
          setSelectedProductIdForDetail(null);
          handleOpenNewMovement(type, pId);
        }}
        onEditProduct={(p) => {
          setSelectedProductIdForDetail(null);
          setProductToEdit(p);
          setIsProductModalOpen(true);
        }}
        onDeleteProduct={(p) => {
          setSelectedProductIdForDetail(null);
          setProductToDelete(p);
          setDeleteError(null);
        }}
        onOpenRequest={(pId) => {
          setSelectedProductIdForDetail(null);
          handleOpenNewRequest('preparar_carga', pId);
        }}
        onOrderProduct={(p) => {
          setSelectedProductIdForDetail(null);
          handleStartOrderFromProduct(p);
        }}
      />

      {/* Project Form Modal */}
      <ProjectFormModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={(created) => {
          showToast(`Obra "${created.nombre}" dada de alta`);
          loadAllData();
        }}
      />

      {/* Request Form Modal (Carga / Material Nuevo) */}
      <RequestFormModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={(created) => {
          showToast(
            created.tipo_solicitud === 'preparar_carga'
              ? 'Solicitud de carga enviada al almacén'
              : 'Solicitud de nuevo material enviada al administrador',
            'success'
          );
          loadAllData();
        }}
        products={products}
        projects={projects}
        currentUser={currentUser}
        defaultType={requestModalDefaultType}
        defaultProductId={requestModalDefaultProductId}
        defaultProjectId={requestModalDefaultProjectId}
      />

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-2">
              ¿Eliminar producto?
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              ¿Estás seguro de que deseas eliminar <strong>{productToDelete.nombre}</strong> (código:{' '}
              {productToDelete.codigo})? Esta acción no se puede deshacer.
            </p>

            {deleteError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setProductToDelete(null);
                  setDeleteError(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category and Families Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        products={products}
        onCategoriesUpdated={loadAllData}
        onShowToast={showToast}
      />

      {/* Provider Manager Modal */}
      <ProviderManagerModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        providers={providers}
        products={products}
        onProvidersUpdated={loadAllData}
        onShowToast={showToast}
      />

      {/* Order Form Modal (Crear / Editar Pedido a Distribuidor) */}
      <OrderFormModal
        isOpen={isOrderModalOpen}
        orderToEdit={orderToEdit}
        fromRequest={orderFromRequest}
        initialProduct={orderProduct}
        providers={providers}
        products={products}
        projects={projects}
        currentUser={currentUser}
        onClose={() => {
          setIsOrderModalOpen(false);
          setOrderToEdit(null);
          setOrderFromRequest(null);
          setOrderProduct(null);
        }}
        onSuccess={() => {
          showToast('Pedido a distribuidor tramitado y guardado correctamente');
          loadAllData();
        }}
      />

      {/* Receive Order Modal (Recepción en almacén y catalogación si es nuevo) */}
      <ReceiveOrderModal
        isOpen={isReceiveOrderModalOpen}
        order={orderToReceive}
        products={products}
        categories={categories}
        projects={projects}
        currentUser={currentUser}
        onClose={() => {
          setIsReceiveOrderModalOpen(false);
          setOrderToReceive(null);
        }}
        onSuccess={() => {
          showToast('Material recibido registrado en inventario con éxito', 'success');
          loadAllData();
        }}
        onShowToast={showToast}
      />

      {/* Request Edit Modal (con motivo de cambio y auditoría) */}
      <RequestEditModal
        isOpen={isRequestEditModalOpen}
        request={requestToEdit}
        currentUser={currentUser}
        projects={projects}
        products={products}
        onClose={() => {
          setIsRequestEditModalOpen(false);
          setRequestToEdit(null);
        }}
        onSuccess={() => {
          showToast('Petición editada y registrada en el historial de cambios');
          loadAllData();
        }}
        onShowToast={showToast}
      />

      {/* Request Audit History Modal */}
      <RequestHistoryModal
        isOpen={isRequestHistoryModalOpen}
        request={requestForHistory}
        onClose={() => {
          setIsRequestHistoryModalOpen(false);
          setRequestForHistory(null);
        }}
      />

      {/* System Date & Time Configuration Modal */}
      <DateTimeModal
        isOpen={isTimeModalOpen}
        onClose={closeTimeModal}
        onShowToast={showToast}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div
          id="global-toast-notification"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all transform animate-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-neutral-900 text-white border-neutral-800'
              : toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : 'bg-neutral-900 text-white border-neutral-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-[#EA1D24] shrink-0" />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
