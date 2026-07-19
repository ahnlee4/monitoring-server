import unittest
from datetime import datetime, timezone

from app.edge_registry import hash_edge_token, normalize_edge_code, verify_edge_token
from app.edge_runtime import EdgeRuntimeStore


NOW = datetime(2026, 7, 19, 5, 0, tzinfo=timezone.utc)


class EdgeRegistryTest(unittest.TestCase):
    def test_token_hash_is_verified_without_storing_plaintext(self) -> None:
        token_hash = hash_edge_token("edge-secret-token")
        self.assertTrue(verify_edge_token("edge-secret-token", token_hash))
        self.assertFalse(verify_edge_token("wrong-token", token_hash))
        self.assertNotIn("edge-secret-token", token_hash)

    def test_codes_are_normalized_and_validated(self) -> None:
        self.assertEqual(normalize_edge_code(" Branch-01 "), "branch-01")
        with self.assertRaises(ValueError):
            normalize_edge_code("지점 1")

    def test_runtime_values_are_isolated_by_edge(self) -> None:
        runtime = EdgeRuntimeStore()
        runtime.update(1, [("0000", "400")], ["0000"], NOW, "edge-1")
        runtime.update(2, [("0000", "700")], ["0000"], NOW, "edge-2")

        edge1, _ = runtime.snapshots(1)
        edge2, _ = runtime.snapshots(2)

        self.assertEqual(edge1["0000"][0], "400")
        self.assertEqual(edge2["0000"][0], "700")


if __name__ == "__main__":
    unittest.main()
