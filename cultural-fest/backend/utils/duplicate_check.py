async def check_duplicate_roll(supabase, roll_no: str) -> dict:
    """
    Returns { "is_duplicate": bool, "found_in": str or None }
    Checks students, participants, and volunteers tables.
    """
    tables = ["students", "participants", "volunteers"]
    for table in tables:
        result = supabase.table(table).select("id").eq(
            "roll_no", roll_no
        ).execute()
        if result.data and len(result.data) > 0:
            return {"is_duplicate": True, "found_in": table}
    return {"is_duplicate": False, "found_in": None}
