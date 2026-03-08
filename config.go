from flask import Flask, request, Response, abort
import requests

app = Flask(__name__)

# Define the mapping of machine names to their internal IPs/hostnames
internal_network_map = {
    "alice": "http://IP1",  # Replace IP1 with the actual internal IP or hostname
    "bob": "http://IP2",    # Replace IP2 with the actual internal IP or hostname
    "charlie": "http://IP3", # Replace IP3 with the actual internal IP or hostname
}

def proxy_request(target_url, request):
    """
    Proxies the incoming request to the target URL and returns the response.
    """
    try:
        target_request = requests.request(
            method=request.method,
            url=target_url,
            headers=request.headers,
            data=request.get_data(),
            stream=True,
            timeout=10  # Add a timeout to prevent indefinite blocking
        )
        response = Response(
            response=target_request.iter_content(chunk_size=4096),
            status=target_request.status_code,
            headers=dict(target_request.headers)
        )
        return response
    except requests.exceptions.RequestException as e:
        return Response(f"Error connecting to internal server: {e}", status=502)
    except Exception as e:
        return Response(f"Unexpected error during proxying: {e}", status=500)

@app.route("/<machine_name>/<path:path>", methods=['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'TRACE'])
def internal_proxy(machine_name, path):
    """
    Routes external requests based on the machine name to the corresponding internal server.
    """
    machine_name_lower = machine_name.lower()
    if machine_name_lower in internal_network_map:
        internal_base_url = internal_network_map[machine_name_lower]
        target_url = f"{internal_base_url}/{path}"
        print(f"Proxying request to: {target_url}")
        return proxy_request(target_url, request)
    else:
        abort(404, f"Machine '{machine_name}' not found in internal network.")

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80, debug=True)