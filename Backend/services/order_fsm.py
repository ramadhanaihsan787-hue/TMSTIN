# Backend/services/order_fsm.py
import models
from services.order_service import OrderValidationError

# Ditampung di sini sebagai satu-satunya sumber kebenaran FSM
VALID_TRANSITIONS: dict = {
    models.DOStatus.so_waiting_verification: [
        models.DOStatus.do_verified,
    ],
    models.DOStatus.do_verified: [
        models.DOStatus.do_assigned_to_route,
    ],
    models.DOStatus.do_assigned_to_route: [
        models.DOStatus.delivered_pod_uploaded,
        models.DOStatus.cancelled,
    ],
    models.DOStatus.delivered_pod_uploaded: [
        models.DOStatus.delivered_success,
        models.DOStatus.delivered_partial,
        models.DOStatus.do_assigned_to_route,  # reject POD → balik ke assigned
    ],
    models.DOStatus.delivered_success: [
        models.DOStatus.billed,
    ],
    models.DOStatus.delivered_partial: [
        models.DOStatus.billed,
    ],
    models.DOStatus.cancelled: [],
    models.DOStatus.billed:    [],
}

def validate_status_transition(
    current_status: models.DOStatus,
    new_status: models.DOStatus,
) -> None:
    """
    Lempar OrderValidationError jika transisi tidak diizinkan FSM.
    Dipanggil dari router SEBELUM memanggil method service.
    """
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise OrderValidationError(
            f"Transisi status tidak valid: "
            f"{current_status.value} → {new_status.value}"
        )