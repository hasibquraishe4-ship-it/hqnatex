from django.test import SimpleTestCase
from rest_framework import serializers
from .serializers import IntegrationEndpointSerializer, ManagedNetworkDeviceSerializer, validate_network


class NetworkReadinessSafetyTests(SimpleTestCase):
    def test_valid_networks(self):
        self.assertEqual(validate_network("10.0.0.0/24"), "10.0.0.0/24")
        self.assertEqual(validate_network("2001:db8::/32"), "2001:db8::/32")

    def test_invalid_network_rejected(self):
        with self.assertRaises(serializers.ValidationError):
            validate_network("not-an-ip")

    def test_device_write_mode_rejected(self):
        with self.assertRaises(serializers.ValidationError):
            ManagedNetworkDeviceSerializer().validate_access_mode("write")

    def test_live_execution_mode_rejected(self):
        with self.assertRaises(serializers.ValidationError):
            IntegrationEndpointSerializer().validate_execution_mode("provision")
