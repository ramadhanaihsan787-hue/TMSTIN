import httpx
import datetime
import logging

from dependencies import get_settings
from utils.helpers import time_str_to_minutes

logger = logging.getLogger(__name__)


def _minutes_to_iso(total_minutes: int, date_str: str) -> str:
    base = datetime.datetime.strptime(date_str, "%Y-%m-%d")

    h, m = divmod(total_minutes, 60)

    dt = base + datetime.timedelta(
        hours=int(h % 24),
        minutes=int(m)
    )

    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def validate_route_traffic(route: dict, date_str: str) -> dict:
    """
    Traffic validation after VRP optimization
    """

    try:
        settings = get_settings()

        warnings = []

        stops = [
            s for s in route.get("detail_perjalanan", [])
            if s.get("keterangan") not in ["Start", "Finish"]
        ]

        current_minutes = time_str_to_minutes(settings.vrp_start_time)

        prev_lat = settings.depo_lat
        prev_lon = settings.depo_lon

        for stop in stops:

            lat = stop.get("lat")
            lon = stop.get("lon")

            if not lat or not lon:
                continue

            jam_tiba_str = stop.get("jam_tiba")

            arrival_minutes = time_str_to_minutes(jam_tiba_str)

            tw_end = stop.get("tw_end")

            if tw_end and arrival_minutes > tw_end:

                delay = arrival_minutes - tw_end

                warnings.append({
                    "stop_order": stop.get("urutan"),
                    "store_name": stop.get("nama_toko"),
                    "planned_eta": jam_tiba_str,
                    "delay_minutes": delay,
                    "severity": "HIGH" if delay > 30 else "LOW",
                    "truck_id": route.get("route_id"),
                    "armada": route.get("armada")
                })

            prev_lat = lat
            prev_lon = lon

        return {
            "warnings": warnings,
            "has_critical": any(
                w["severity"] == "HIGH"
                for w in warnings
            ),
            "route_id": route.get("route_id")
        }

    except Exception as e:
        logger.error(f"🚨 VALIDATE TRAFFIC ERROR: {str(e)}")

        return {
            "warnings": [],
            "has_critical": False,
            "route_id": route.get("route_id"),
            "error": str(e)
        }