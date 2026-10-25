import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('upload_config', Path(__file__).with_name('configure-training-uploads.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class UploadConfigTest(unittest.TestCase):
    def test_updates_both_servers_preserving_routes_and_is_idempotent(self):
        source = '''server {
    server_name license-qb.us;
    return 301 https://license-qb.us$request_uri;
}
server {
    server_name license-qb.us;
    root /var/www/momars-app/current/frontend/dist;
    client_max_body_size 20M;
    location /api/ {
        fastcgi_read_timeout 30s;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }
}
'''
        result = module.configured_site(source)
        self.assertEqual(result.count('client_max_body_size 1024M;'), 2)
        self.assertEqual(result.count('fastcgi_read_timeout 600s;'), 2)
        self.assertIn('fastcgi_pass unix:/run/php/php8.3-fpm.sock;', result)
        self.assertIn('return 301 https://license-qb.us$request_uri;', result)
        self.assertNotIn('20M;', result)
        self.assertEqual(module.configured_site(result), result)

    def test_refuses_unrelated_sites_and_unknown_config_layouts(self):
        for source in [
            'server {\nserver_name other.example;\nroot /var/www/momars-app/current;\n}',
            'server {\nserver_name license-qb.us;\nroot /var/www/other;\n}',
            'server_name license-qb.us;\nroot /var/www/momars-app/current;',
        ]:
            with self.assertRaises(ValueError):
                module.configured_site(source)


if __name__ == '__main__':
    unittest.main()
