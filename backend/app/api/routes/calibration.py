from __future__ import annotations

import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter()

XORG_CONF_PATH = Path("/etc/X11/xorg.conf.d/99-calibration.conf")
DEVICE_ID = 11
DEVICE_NAME = "Silicon Integrated System Co. SiS HID Touch Controller"


class MatrixPayload(BaseModel):
    matrix: list[float]  # 9 values


@router.post("/calibration/apply", status_code=status.HTTP_200_OK)
def apply_calibration(payload: MatrixPayload) -> dict[str, str]:
    if len(payload.matrix) != 9:
        raise HTTPException(status_code=400, detail="matrix must have exactly 9 values")

    mat = payload.matrix
    prop_values = " ".join(str(v) for v in mat)

    try:
        subprocess.run(
            ["xinput", "set-prop", str(DEVICE_ID), "Coordinate Transformation Matrix"] + [str(v) for v in mat],
            check=True,
            capture_output=True,
            text=True,
            env={"DISPLAY": ":0"},
        )
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"xinput failed: {e.stderr}") from e
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail="xinput not found") from e

    a, b, c, d, e, f = mat[0], mat[1], mat[2], mat[3], mat[4], mat[5]

    conf = f"""Section "InputClass"
    Identifier    "calibration"
    MatchProduct    "{DEVICE_NAME}"
    Option    "TransformationMatrix"    "{a} {b} {c} {d} {e} {f} 0 0 1"
EndSection
"""

    try:
        XORG_CONF_PATH.write_text(conf)
    except PermissionError:
        # 書き込み権限がない場合はsudoで試みる
        try:
            subprocess.run(
                ["sudo", "tee", str(XORG_CONF_PATH)],
                input=conf,
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"failed to write config: {e.stderr}") from e

    return {"status": "ok", "matrix": prop_values}
