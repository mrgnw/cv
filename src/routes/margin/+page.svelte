<script>
	let margin = $state(25);
</script>

<div class="page-container">
	<div class="page">
		<div class="content">
			<div class="controls">
				<label>
					Print margin size (mm):
					<input 
						type="number" 
						bind:value={margin}
						min="5"
						max="75"
						step="5"
					/>
				</label>
			</div>
			<p>
				This page demonstrates print margins using CSS variables.
				The current margin is set to {margin} millimeters.
			</p>
		</div>
	</div>
</div>

<style>
	.controls {
		padding: 1rem;
		border-bottom: 1px solid #ccc;
	}

	.page-container {
		width: 100%;
		display: flex;
		justify-content: center;
		padding: 2rem;
	}

	.page {
		/* Standard US Letter size in pixels (215.9 x 279.4 mm) */
		width: 215.9mm;
		height: 279.4mm;
		position: relative;
		
		/* Add outline to visualize the page */
		outline: 2px solid #333;
		background: white;
		box-shadow: 0 0 10px rgba(0,0,0,0.1);
	}

	.content {
		position: absolute;
		top: 25mm;
		right: 25mm;
		bottom: 25mm;
		left: 25mm;
		outline: 1px dashed #999;
		overflow: auto;
	}

	p {
		padding: 1rem;
		margin: 0;
	}

	input {
		margin-left: 0.5rem;
		width: 5rem;
	}

	@media print {
		.page {
			outline: none;
			box-shadow: none;
			width: 100%;
			height: 100%;
		}

		.content {
			top: var(--print-margin);
			right: var(--print-margin);
			bottom: var(--print-margin);
			left: var(--print-margin);
			outline: none;
		}

		.controls {
			display: none;
		}
	}
</style>