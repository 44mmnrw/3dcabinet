<div id="react-configurator-root"></div>

@push('scripts')
  <!-- React via CDN (no build) -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- EventBus and Logic already included via other stacks -->
  <script type="module">
    import { ConfiguratorPanel } from "{{ asset('js/react/widgets.js') }}";

    const rootEl = document.getElementById('react-configurator-root');
    if (rootEl) {
      const root = ReactDOM.createRoot(rootEl);
      root.render(React.createElement(ConfiguratorPanel));
    } else {
      console.warn('react-configurator-root not found');
    }
  </script>
@endpush
